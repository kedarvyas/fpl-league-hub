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
from .database import engine, get_db
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
        "https://fpl-tacticos-leaguehub.netlify.app",  # Your Netlify domain
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
    except requests.RequestException as e:
        logger.error(f"Error fetching transfers for team {team_id}: {e}")
        return []

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

@app.get("/api/entry/{team_id}/event/{event_id}/picks")
async def get_team_picks(team_id: int, event_id: int):
    try:
        url = f"https://fantasy.premierleague.com/api/entry/{team_id}/event/{event_id}/picks/"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Error fetching picks for team {team_id} event {event_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch picks: {str(e)}")

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
        existing_league = db.query(models.League).filter(models.League.id == 738279).first()
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
            id=738279,
            name="FPL Tacticos League",
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