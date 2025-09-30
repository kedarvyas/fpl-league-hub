import os
from dotenv import load_dotenv
import sys
import requests
import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime
from .database import engine, get_db, get_supabase
import json
from sqlalchemy import text
from typing import Optional



# Configure logging first thing
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Log startup information
logger.debug(f"Current working directory: {os.getcwd()}")
logger.debug(f"Python path: {sys.path}")
logger.debug(f"Environment variables: {dict(os.environ)}")
logger.debug(f"Directory contents: {os.listdir()}")


# Load environment variables
load_dotenv()

# Get league ID from environment variable with a default value
LEAGUE_ID = int(os.getenv("LEAGUE_ID", "738279"))

try:
    models.Base.metadata.create_all(bind=engine)
    logger.debug("Successfully created database tables")
except Exception as e:
    logger.error(f"Error creating database tables: {str(e)}")
    raise

app = FastAPI()

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Your local frontend
        "http://localhost:3004",  # Alternative frontend port
        #"https://fpl-tacticos-leaguehub.netlify.app",  # Your Netlify domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/debug-info")
async def debug_info():
    """Endpoint to verify API is working and check environment"""
    import sys
    import os
    return {
        "python_path": sys.path,
        "current_directory": os.getcwd(),
        "environment_vars": dict(os.environ),
        "app_module_location": __file__
    }

@app.get("/debug/supabase-test")
async def test_supabase_connection():
    """Test Supabase connection"""
    try:
        supabase = get_supabase()
        # Test basic connection by getting user (will return empty for anon key)
        response = supabase.auth.get_user()
        return {
            "supabase_connected": True,
            "message": "Supabase client created successfully",
            "user": response.user
        }
    except Exception as e:
        logger.error(f"Supabase connection error: {str(e)}")
        return {
            "supabase_connected": False,
            "error": str(e)
        }

@app.get("/debug/check_league/{league_id}")
async def check_league(league_id: int, db: Session = Depends(get_db)):
    league = db.query(models.League).filter(models.League.id == league_id).first()
    if league is None:
        return {"exists": False, "message": "League not found"}
    return {
        "exists": True,
        "league": {
            "id": league.id,
            "name": league.name,
            "created_at": league.created_at,
            "updated_at": league.updated_at,
            "total_teams": league.total_teams,
            "average_score": league.average_score,
            "highest_score": league.highest_score
        }
    }

from sqlalchemy import text
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

@app.get("/debug/init-db")
def initialize_database(db: Session = Depends(get_db)):
    try:
        # Drop existing table if it exists
        db.execute(text("DROP TABLE IF EXISTS leagues CASCADE"))
        
        # Create new table with all required columns
        create_table_sql = """
        CREATE TABLE leagues (
            id INTEGER PRIMARY KEY,
            name VARCHAR,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE,
            total_teams INTEGER DEFAULT 0,
            average_score FLOAT DEFAULT 0.0,
            highest_score INTEGER DEFAULT 0
        )
        """
        db.execute(text(create_table_sql))
        db.commit()
        
        return {"message": "Database initialized successfully"}
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        db.rollback()
        return {
            "error": "Failed to initialize database",
            "detail": str(e)
        }

# Helper Functions
def get_position(element_type):
    positions = {1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD'}
    return positions.get(element_type, 'Unknown')

def fetch_fpl_standings(league_id: int):
    url = f"https://fantasy.premierleague.com/api/leagues-h2h/{league_id}/standings/"
    response = None
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data['standings']['results']
    except requests.RequestException as e:
        logger.error(f"Error fetching FPL data: {e}")
        if response is not None:
            logger.error(f"Response status code: {response.status_code}")
            logger.error(f"Response content: {response.text}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch FPL data: {str(e)}")
    except KeyError as e:
        logger.error(f"Unexpected data structure: {e}")
        if response is not None:
            logger.error(f"Response content: {response.text}")
        raise HTTPException(status_code=500, detail="Unexpected data structure from FPL API")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

def fetch_fpl_matches(league_id: int):
    url = f"https://fantasy.premierleague.com/api/leagues-h2h/{league_id}/matches/"
    response = None
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()['results']
    except requests.RequestException as e:
        logger.error(f"Error fetching FPL matches: {e}")
        if response is not None:
            logger.error(f"Response status code: {response.status_code}")
            logger.error(f"Response content: {response.text}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch FPL matches: {str(e)}")
    except KeyError as e:
        logger.error(f"Unexpected data structure in matches: {e}")
        if response is not None:
            logger.error(f"Response content: {response.text}")
        raise HTTPException(status_code=500, detail="Unexpected data structure from FPL API")
    except Exception as e:
        logger.error(f"Unexpected error in fetch_fpl_matches: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

def calculate_form(matches, team_id):
    recent_matches = sorted(matches, key=lambda m: m['event'], reverse=True)[:3]
    form = []
    for match in recent_matches:
        if match['finished']:
            if match['winner'] == team_id:
                form.append('W')
            elif match['winner'] is None:
                form.append('D')
            else:
                form.append('L')
    return ''.join(form[::-1])  # Reverse to show oldest to newest

# API Routes
@app.get("/")
async def root():
    return {"message": "Welcome to FPL League Hub API"}

@app.get("/api/bootstrap-static")
async def get_bootstrap_static():
    try:
        url = "https://fantasy.premierleague.com/api/bootstrap-static/"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch FPL data: {str(e)}")

@app.get("/api/entry/{team_id}/transfers")
async def get_team_transfers(team_id: int):
    try:
        url = f"https://fantasy.premierleague.com/api/entry/{team_id}/transfers/"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Error fetching transfers for team {team_id}: {e}")
        return []
    
@app.get("/api/current-gameweek")
async def get_current_gameweek():
    try:
        # Fetch bootstrap data
        url = "https://fantasy.premierleague.com/api/bootstrap-static/"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Find current gameweek
        current_gw = next((gw for gw in data['events'] if gw['is_current']), None)
        if not current_gw:
            # If no current gameweek, find the next one
            current_gw = next((gw for gw in data['events'] if gw['is_next']), None)
        
        if not current_gw:
            raise HTTPException(status_code=404, detail="No current or next gameweek found")
            
        return current_gw
    except Exception as e:
        logger.error(f"Error fetching current gameweek: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/element-summary/{player_id}")
async def get_player_summary(player_id: int):
    try:
        url = f"https://fantasy.premierleague.com/api/element-summary/{player_id}/"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Error fetching player summary for player {player_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch player summary: {str(e)}")

@app.get("/api/team/{team_id}")
async def get_team_data(team_id: int):
    try:
        url = f"https://fantasy.premierleague.com/api/entry/{team_id}/"
        response = requests.get(url)
        response.raise_for_status()
        team_data = response.json()

        # Get current gameweek from bootstrap
        bootstrap_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
        bootstrap_response = requests.get(bootstrap_url)
        bootstrap_response.raise_for_status()
        bootstrap_data = bootstrap_response.json()

        # Find current gameweek
        current_gw = next((gw for gw in bootstrap_data['events'] if gw['is_current']), None)
        if current_gw:
            team_data['current_event'] = current_gw['id']
            current_gw_id = current_gw['id']

            # Get previous gameweek data if available
            if current_gw_id > 1:
                try:
                    # Fetch team history to get previous gameweek rank
                    history_url = f"https://fantasy.premierleague.com/api/entry/{team_id}/history/"
                    history_response = requests.get(history_url)
                    history_response.raise_for_status()
                    history_data = history_response.json()

                    # Get current gameweek data from history
                    current_gw_history = next((gw for gw in history_data['current'] if gw['event'] == current_gw_id), None)

                    if current_gw_history:
                        team_data['current_event_rank'] = current_gw_history['overall_rank']

                    # Get previous gameweek data
                    prev_gw_history = next((gw for gw in history_data['current'] if gw['event'] == current_gw_id - 1), None)

                    if prev_gw_history:
                        team_data['previous_event_rank'] = prev_gw_history['overall_rank']

                        # Calculate rank change (positive means improvement/rank went down, negative means rank went up)
                        if current_gw_history:
                            rank_change = prev_gw_history['overall_rank'] - current_gw_history['overall_rank']
                            team_data['rank_change'] = rank_change

                except Exception as e:
                    logger.warning(f"Could not fetch history data: {e}")
                    # Fall back to basic data without rank change
                    pass

        return team_data
    except requests.RequestException as e:
        logger.error(f"Error fetching team data for team {team_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch team data: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching team data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/api/team/{team_id}/history")
async def get_team_history(team_id: int):
    try:
        # Fetch team history from FPL API
        history_url = f"https://fantasy.premierleague.com/api/entry/{team_id}/history/"
        history_response = requests.get(history_url)
        history_response.raise_for_status()
        history_data = history_response.json()

        # Process current season data
        current_season = history_data.get('current', [])

        if not current_season:
            return {"ranks": [], "highest_rank": None, "lowest_rank": None, "highest_rank_gw": None, "lowest_rank_gw": None}

        # Extract rank data for each gameweek
        ranks = []
        for gw in current_season:
            ranks.append({
                "gameweek": gw['event'],
                "rank": gw['overall_rank'],
                "points": gw['points'],
                "total_points": gw['total_points']
            })

        # Find highest and lowest ranks
        if ranks:
            highest_rank_data = min(ranks, key=lambda x: x['rank'])  # Lower number = better rank
            lowest_rank_data = max(ranks, key=lambda x: x['rank'])   # Higher number = worse rank

            return {
                "ranks": ranks,
                "highest_rank": highest_rank_data['rank'],
                "lowest_rank": lowest_rank_data['rank'],
                "highest_rank_gw": highest_rank_data['gameweek'],
                "lowest_rank_gw": lowest_rank_data['gameweek']
            }
        else:
            return {"ranks": [], "highest_rank": None, "lowest_rank": None, "highest_rank_gw": None, "lowest_rank_gw": None}

    except requests.RequestException as e:
        logger.error(f"Error fetching team history for team {team_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch team history: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching team history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/api/team/{team_id}/previous-seasons")
async def get_team_previous_seasons(team_id: int):
    try:
        # Fetch team history from FPL API
        history_url = f"https://fantasy.premierleague.com/api/entry/{team_id}/history/"
        history_response = requests.get(history_url)
        history_response.raise_for_status()
        history_data = history_response.json()

        # Process previous seasons data
        previous_seasons = history_data.get('past', [])

        if not previous_seasons:
            return {"seasons": []}

        # Format the seasons data
        seasons = []
        total_players_map = {
            "2023/24": 11200000,  # Approximate total players for each season
            "2022/23": 10900000,
            "2021/22": 9000000,
            "2020/21": 8500000,
            "2019/20": 7600000,
            "2018/19": 6900000,
            "2017/18": 5700000,
            "2016/17": 4600000,
            "2015/16": 4200000,
            "2014/15": 3500000,
            "2013/14": 3200000,
        }

        for season in previous_seasons:
            season_name = season['season_name']
            total_players = total_players_map.get(season_name, 10000000)  # Default fallback
            percentage = (season['rank'] / total_players) * 100

            # Determine rank tier for styling
            if percentage <= 1:
                tier = "top1"
                tier_color = "#10b981"  # Green
                tier_icon = "🏆"
            elif percentage <= 5:
                tier = "top5"
                tier_color = "#f59e0b"  # Yellow
                tier_icon = "🥇"
            elif percentage <= 10:
                tier = "top10"
                tier_color = "#8b5cf6"  # Purple
                tier_icon = "🥈"
            elif percentage <= 25:
                tier = "top25"
                tier_color = "#3b82f6"  # Blue
                tier_icon = "🥉"
            else:
                tier = "other"
                tier_color = "#6b7280"  # Gray
                tier_icon = "🔵"

            seasons.append({
                "season": season_name,
                "total_points": season['total_points'],
                "rank": season['rank'],
                "percentage": round(percentage, 2),
                "tier": tier,
                "tier_color": tier_color,
                "tier_icon": tier_icon
            })

        # Sort by season (most recent first)
        seasons.sort(key=lambda x: x['season'], reverse=True)

        return {"seasons": seasons}

    except requests.RequestException as e:
        logger.error(f"Error fetching previous seasons for team {team_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch previous seasons: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching previous seasons: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/api/fixtures/{gameweek_id}")
async def get_gameweek_fixtures(gameweek_id: int):
    try:
        # First get bootstrap data for team mappings
        bootstrap_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
        bootstrap_response = requests.get(bootstrap_url)
        bootstrap_response.raise_for_status()
        bootstrap_data = bootstrap_response.json()

        # Create team mapping
        teams = {team['id']: team for team in bootstrap_data['teams']}

        # Get fixtures for the specific gameweek
        fixtures_url = "https://fantasy.premierleague.com/api/fixtures/"
        fixtures_response = requests.get(fixtures_url)
        fixtures_response.raise_for_status()
        fixtures_data = fixtures_response.json()

        # Filter fixtures for the specified gameweek
        gameweek_fixtures = [
            fixture for fixture in fixtures_data
            if fixture['event'] == gameweek_id and fixture['finished']
        ]

        # Format the fixtures data
        results = []
        for fixture in gameweek_fixtures:
            home_team = teams.get(fixture['team_h'])
            away_team = teams.get(fixture['team_a'])

            if home_team and away_team:
                results.append({
                    'homeTeam': {
                        'id': home_team['id'],
                        'name': home_team['name'],
                        'abbreviation': home_team['short_name']
                    },
                    'awayTeam': {
                        'id': away_team['id'],
                        'name': away_team['name'],
                        'abbreviation': away_team['short_name']
                    },
                    'homeScore': fixture['team_h_score'],
                    'awayScore': fixture['team_a_score'],
                    'finished': fixture['finished'],
                    'kickoff_time': fixture['kickoff_time']
                })

        return results

    except requests.RequestException as e:
        logger.error(f"Error fetching fixtures for gameweek {gameweek_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch fixtures: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching fixtures: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/api/entry/{team_id}/event/{event_id}/picks")
async def get_team_picks(team_id: int, event_id: int):
    try:
        url = f"https://fantasy.premierleague.com/api/entry/{team_id}/event/{event_id}/picks/"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error fetching picks for team {team_id} event {event_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch picks: {str(e)}"
        )

@app.get("/api/weekly-matchups/{league_id}")
async def get_weekly_matchups(league_id: int, event: int):
    try:
        # Construct the FPL API URL
        url = f"https://fantasy.premierleague.com/api/leagues-h2h-matches/league/{league_id}/?event={event}&page=1"
        
        # Make the request
        response = requests.get(url)
        response.raise_for_status()  # Raise exception for non-200 status codes
        
        # Get the data
        data = response.json()

        # Return only the results array
        return data.get('results', [])
        
    except requests.RequestException as e:
        logger.error(f"Error fetching weekly matchups: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weekly matchups: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_weekly_matchups: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.get("/api/matchup/{match_id}")
async def get_matchup_details(match_id: int, event: int):
    logger.info(f"Fetching matchup details for match_id: {match_id}, event: {event}")
    
    def process_team_data(entry_id, all_players, live_data):
        picks_url = f"https://fantasy.premierleague.com/api/entry/{entry_id}/event/{event}/picks/"
        picks_response = requests.get(picks_url)
        picks_response.raise_for_status()
        picks_data = picks_response.json()

        processed_data = []
        for pick in picks_data['picks']:
            player = next((p for p in all_players if p['id'] == pick['element']), None)
            if player is None:
                continue
            live_stats = next((p for p in live_data['elements'] if p['id'] == pick['element']), {})
            processed_data.append({
                "id": player['id'],
                "name": player['web_name'],
                "position": get_position(player['element_type']),
                "points": live_stats.get('stats', {}).get('total_points', 0),
                "isCaptain": pick['is_captain'],
                "club": team_id_to_code[player['team']],
                "yellowCards": live_stats.get('stats', {}).get('yellow_cards', 0),
                "redCards": live_stats.get('stats', {}).get('red_cards', 0),
                "isStarting": pick['position'] <= 11,
                "multiplier": pick['multiplier']
            })
        return processed_data

    def get_manager_name(entry_id):
        manager_url = f"https://fantasy.premierleague.com/api/entry/{entry_id}/"
        manager_response = requests.get(manager_url)
        manager_response.raise_for_status()
        manager_data = manager_response.json()
        return f"{manager_data['player_first_name']} {manager_data['player_last_name']}"

    try:
        # Use environment variable for league ID
        league_url = f"https://fantasy.premierleague.com/api/leagues-h2h-matches/league/{LEAGUE_ID}/?event={event}&page=1"
        league_response = requests.get(league_url)
        league_response.raise_for_status()
        league_data = league_response.json()

        match_data = next((match for match in league_data['results'] if match['id'] == match_id), None)
        if not match_data:
            raise HTTPException(status_code=404, detail=f"Match with id {match_id} not found in league data")

        # Fetch live data for the specific gameweek
        live_url = f"https://fantasy.premierleague.com/api/event/{event}/live/"
        live_response = requests.get(live_url)
        live_response.raise_for_status()
        live_data = live_response.json()

        # Fetch player static data
        static_url = 'https://fantasy.premierleague.com/api/bootstrap-static/'
        static_response = requests.get(static_url)
        static_response.raise_for_status()
        static_data = static_response.json()

        # Create a mapping of team ID to team code
        team_id_to_code = {team['id']: team['short_name'] for team in static_data['teams']}

        team_h_manager = get_manager_name(match_data['entry_1_entry'])
        team_a_manager = get_manager_name(match_data['entry_2_entry'])

        result = {
            "team_h_name": match_data['entry_1_name'],
            "team_a_name": match_data['entry_2_name'],
            "team_h_manager": team_h_manager,
            "team_a_manager": team_a_manager,
            "team_h_score": match_data['entry_1_points'],
            "team_a_score": match_data['entry_2_points'],
            "team_h_picks": process_team_data(match_data['entry_1_entry'], static_data['elements'], live_data),
            "team_a_picks": process_team_data(match_data['entry_2_entry'], static_data['elements'], live_data),
        }
        return result

    except requests.RequestException as e:
        logger.error(f"Error fetching data from FPL API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching data from FPL API: {str(e)}")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}")
        logger.error(f"Current data structure: {json.dumps(locals(), default=str, indent=2)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/api/leagues/{league_id}/standings")
async def get_fpl_standings(league_id: int):
    try:
        standings_url = f"https://fantasy.premierleague.com/api/leagues-h2h/{league_id}/standings/"
        standings_response = requests.get(standings_url)
        standings_response.raise_for_status()
        standings_data = standings_response.json()
        return standings_data['standings']['results']
    except Exception as e:
        logger.error(f"Error in get_fpl_standings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while fetching standings: {str(e)}")

# Database Routes
@app.get("/api/leagues")
async def get_leagues(db: Session = Depends(get_db)):
    leagues = db.query(models.League).all()
    return leagues

@app.get("/api/leagues/{league_id}", response_model=schemas.League)
async def get_league(league_id: int, db: Session = Depends(get_db)):
    league = db.query(models.League).filter(models.League.id == league_id).first()
    if league is None:
        raise HTTPException(status_code=404, detail="League not found")
    if league.updated_at is None:
        league.updated_at = league.created_at
        db.commit()
    return league

from sqlalchemy import text

@app.get("/debug/db-test")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        # Try to execute a simple query using text()
        result = db.execute(text("SELECT 1"))
        db.commit()
        return {"message": "Database connection successful", "result": result.scalar()}
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return {
            "error": "Database connection failed",
            "detail": str(e)
        }

@app.get("/debug/create_league")
@app.post("/debug/create_league")
def create_league(db: Session = Depends(get_db)):
    logger.info("Starting league creation process")
    try:
        # First test the connection
        db.execute(text("SELECT 1"))
        
        # Check if league already exists
        logger.info("Checking for existing league")
        existing_league = db.query(models.League).filter(models.League.id == LEAGUE_ID).first()
        if existing_league:
            logger.info("League already exists")
            return {
                "message": "League already exists",
                "league": {
                    "id": existing_league.id,
                    "name": existing_league.name,
                    "created_at": str(existing_league.created_at),
                }
            }
        
        logger.info("Creating new league")
        current_time = datetime.utcnow()
        new_league = models.League(
            id=LEAGUE_ID,
            name="FPL League Hub",
            created_at=current_time,
            updated_at=current_time,
            total_teams=0,
            average_score=0.0,
            highest_score=0
        )
        
        logger.info("Adding league to database session")
        db.add(new_league)
        
        logger.info("Committing to database")
        db.commit()
        
        logger.info("Refreshing league object")
        db.refresh(new_league)
        
        return {
            "message": "League created successfully",
            "league": {
                "id": new_league.id,
                "name": new_league.name,
                "created_at": str(new_league.created_at),
            }
        }
    except Exception as e:
        logger.error(f"Error during league creation: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.exception("Full traceback:")
        db.rollback()
        return {
            "error": "Failed to create league",
            "detail": str(e),
            "type": str(type(e))
        }

@app.put("/api/leagues/{league_id}", response_model=schemas.League)
async def update_league(league_id: int, league: schemas.LeagueUpdate, db: Session = Depends(get_db)):
    db_league = db.query(models.League).filter(models.League.id == league_id).first()
    if db_league is None:
        raise HTTPException(status_code=404, detail="League not found")
    
    update_data = league.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(db_league, key, value)
    
    db.commit()
    db.refresh(db_league)
    return db_league

@app.delete("/api/leagues/{league_id}", response_model=schemas.League)
async def delete_league(league_id: int, db: Session = Depends(get_db)):
    league = db.query(models.League).filter(models.League.id == league_id).first()
    if league is None:
        raise HTTPException(status_code=404, detail="League not found")
    db.delete(league)
    db.commit()
    return league