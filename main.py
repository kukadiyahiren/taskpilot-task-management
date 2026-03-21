from fastapi import FastAPI

app = FastAPI(title="AI-Avengers-Hackathon-BE")

@app.get("/")
def read_root():
    return {"message": "Welcome to AI-Avengers-Hackathon API!"}
