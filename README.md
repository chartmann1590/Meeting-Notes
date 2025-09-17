# Meeting Notes App

A comprehensive meeting transcription and AI-powered analysis application built with FastAPI, React, and Ollama.

## 🚧 Under Active Development

This project is currently under active development. Features are being added and refined regularly. The application is functional but may have breaking changes between versions.

## 🚀 Features

### Core Functionality
- **Real-time Meeting Transcription**: Live audio recording and transcription
- **Speaker Diarization**: Automatic speaker identification and labeling
- **AI-Powered Analysis**: Generate summaries, action items, follow-ups, and risk assessments
- **Multiple Export Formats**: Export meetings in MD, TXT, JSON, SRT, VTT, and CSV formats
- **Session Management**: Store, search, and manage meeting sessions
- **Settings Configuration**: Customizable AI models and application settings

### Export Formats
- **Markdown (MD)**: Comprehensive meeting reports with formatting
- **Plain Text (TXT)**: Simple text transcripts
- **JSON**: Structured data for integration
- **SRT/VTT**: Subtitle files for video players
- **CSV**: Action items for spreadsheet import

### AI Capabilities
- **TL;DR Summaries**: Quick meeting overviews
- **Action Items**: Extracted tasks with owners and due dates
- **Follow-ups**: Identified follow-up actions
- **Risk Assessment**: Potential risks and concerns
- **Speaker Management**: Edit and merge speaker identities

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Python web framework
- **SQLAlchemy**: Database ORM
- **SQLite**: Database storage
- **Ollama**: Local LLM integration
- **Whisper**: Speech-to-text transcription
- **PyAnnote**: Speaker diarization

### Frontend
- **React**: User interface framework
- **Vite**: Build tool and development server
- **Axios**: HTTP client
- **Tailwind CSS**: Styling framework

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

## 📋 Prerequisites

- Docker and Docker Compose
- Git
- At least 8GB RAM (for AI processing)
- Modern web browser

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone http://10.0.0.129:3000/charles/Meeting-Notes.git
   cd Meeting-Notes
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8001
   - Default passcode: `admin123`

## 🔧 Configuration

### Environment Variables
- `VITE_API_URL`: Frontend API URL (default: http://localhost:8001)
- `OLLAMA_HOST`: Ollama service URL (default: http://localhost:11435)

### Settings
Access the settings page to configure:
- AI model selection
- Auto-deletion settings
- Retention policies
- Ollama configuration

## 📖 Usage

### Starting a Meeting
1. Navigate to the Sessions page
2. Click "Start Live" to begin recording
3. Allow microphone permissions
4. Speak naturally - the app will transcribe in real-time

### Uploading Recordings
1. Go to the Upload page
2. Select your audio file
3. Enter meeting title and speaker information
4. Click upload to process

### Managing Sessions
- **View Sessions**: Browse all recorded meetings
- **Search & Filter**: Find specific sessions by title or date
- **Export**: Download in multiple formats
- **AI Analysis**: Generate summaries and action items

### Speaker Management
- **Edit Names**: Click on speaker labels to rename
- **Merge Speakers**: Combine multiple speaker identities
- **Color Coding**: Visual speaker identification

## 🔍 API Documentation

The backend provides a RESTful API with the following endpoints:

### Authentication
- `POST /auth/verify` - Verify passcode

### Sessions
- `GET /sessions` - List all sessions
- `POST /sessions` - Create new session
- `GET /sessions/{id}` - Get session details
- `GET /sessions/{id}/speakers` - Get session speakers
- `GET /sessions/{id}/segments` - Get session segments

### AI Processing
- `GET /sessions/{id}/summary` - Get AI summary
- `GET /sessions/{id}/action-items` - Get action items
- `GET /sessions/{id}/follow-ups` - Get follow-ups
- `GET /sessions/{id}/risks` - Get risk assessment
- `POST /sessions/{id}/ai/queue` - Queue AI processing

### Export
- `GET /sessions/{id}/export/{format}` - Export session
  - Formats: `md`, `txt`, `json`, `srt`, `vtt`, `csv`

### Settings
- `GET /settings` - Get application settings
- `PUT /settings` - Update settings

## 🏗️ Development

### Project Structure
```
meeting-notes-app/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application
│   ├── models.py           # Database models
│   ├── export_service.py   # Export functionality
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── services/       # API services
│   └── package.json        # Node dependencies
├── docker-compose.yml      # Container orchestration
└── README.md              # This file
```

### Running in Development
```bash
# Backend only
docker-compose up -d backend ollama

# Frontend only (requires backend running)
cd frontend
npm install
npm run dev
```

### Database
The application uses SQLite for data storage. The database file is created automatically and stored in the backend container.

## 🐛 Troubleshooting

### Common Issues

**Audio not recording**
- Check microphone permissions in your browser
- Ensure HTTPS is used for microphone access in production

**AI processing not working**
- Verify Ollama is running: http://localhost:11435
- Check if models are downloaded in Ollama
- Review backend logs for errors

**Export not working**
- Ensure session has data (segments, speakers)
- Check browser console for errors
- Verify authentication token

**Frontend not connecting to backend**
- Check API URL configuration
- Verify backend is running on port 8001
- Check CORS settings

### Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs ollama
```

## 🔒 Security

- **Authentication**: Passcode-based authentication
- **Data Storage**: Local SQLite database
- **AI Processing**: Local Ollama instance (no external API calls)
- **CORS**: Configured for localhost development

## 📝 License

This project is under active development. Please check with the development team for licensing information.

## 🤝 Contributing

This project is under active development. For contribution guidelines, please contact the development team.

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Contact the development team

## 🔄 Version History

- **v0.5.0** - Export system and session management (Current)
- **v0.4.0** - AI processing and analysis
- **v0.3.0** - Speaker diarization
- **v0.2.0** - Basic transcription
- **v0.1.0** - Initial setup

---

**Note**: This application is under active development. Features and APIs may change between versions.