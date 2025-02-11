# FPL League Hub

A comprehensive dashboard for Fantasy Premier League Head-to-Head leagues, providing detailed analytics, player statistics, and league performance tracking.

## Features

- 📊 League Performance Analytics
- 👥 Weekly Head-to-Head Matchups
- 📈 Player Statistics
- 🏆 League Standings
- 🌓 Multiple Theme Options
- 📱 Responsive Design

## Tech Stack

### Frontend
- React
- React Router
- Tailwind CSS
- Recharts
- Lucide React Icons

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL

## Prerequisites

Before running the application, make sure you have the following installed:
- Node.js (v16 or higher)
- Python (3.8 or higher)
- PostgreSQL

## Local Development Setup

### Setting up the Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up the PostgreSQL database:
```bash
# Create a new database
createdb fpl_league_hub

# Update the database URL in database.py:
SQLALCHEMY_DATABASE_URL = "postgresql://username:password@localhost/fpl_league_hub"
```

5. Start the backend server:
```bash
uvicorn main:app --reload
```

The backend server will be running at `http://localhost:8000`

### Setting up the Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Update the API URL:
In the `.env` file, update the API URL to point to your local backend:
```
REACT_APP_API_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm start
```

The frontend will be running at `http://localhost:3000`

## Environment Variables

### Backend
Create a `.env` file in the backend directory with the following variables:
```
DATABASE_URL=postgresql://username:password@localhost/fpl_league_hub
```

### Frontend
Create a `.env` file in the frontend directory with:
```
REACT_APP_API_URL=http://localhost:8000
```

## Usage

1. Access the application at `http://localhost:3000`
2. Enter your FPL League ID to view analytics
3. Navigate through different sections using the top navigation bar
4. Use the theme switcher to change the application's appearance

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Support

For support, please open an issue in the GitHub repository.