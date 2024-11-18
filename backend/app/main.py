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

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get league ID from environment variable with a default value
LEAGUE_ID = int(os.getenv("LEAGUE_ID", "738279"))

# Initialize FastAPI app
app = FastAPI()

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def get_weekly_matchups(league_id: int | None = None, event: int | None = None):
    # Use LEAGUE_ID if league_id is not provided
    league_id = league_id if league_id is not None else LEAGUE_ID
    
    if event is None:
        raise HTTPException(status_code=400, detail="Event parameter is required")
        
    url = f"https://fantasy.premierleague.com/api/leagues-h2h-matches/league/{league_id}/?event={event}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data
    except requests.RequestException as e:
        logger.error(f"Error fetching weekly matchups: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch weekly matchups: {str(e)}")
@app.get("/api/matchup/{match_id}")
async def get_matchup_details(match_id: int, event: int):
    logger.info(f"Fetching matchup details for match_id: {match_id}, event: {event}")
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

@app.post("/api/leagues", response_model=schemas.League)
async def create_league(league: schemas.LeagueCreate, db: Session = Depends(get_db)):
    db_league = models.League(**league.dict())
    db.add(db_league)
    db.commit()
    db.refresh(db_league)
    return db_league

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