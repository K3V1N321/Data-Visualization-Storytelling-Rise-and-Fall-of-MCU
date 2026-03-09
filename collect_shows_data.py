import requests
import pandas as pd
from tqdm import tqdm
API_KEY = "def64965d9a7d884c5b1e68e08e70588"
URL = "https//api.themoviedb.org/3/search/tv"
shows = ["WandaVision", "The Falcon and The Winter Soldier", "Loki",
         "What If...?", "Hawkeye", "Moon Knight", "Ms. Marvel",
         "I am Groot", "She-Hulk: Attorney at Law", "Werewolf By Night",
         "The Guardians of the Galaxy Holiday Special", "Secret Invasion", "Echo",
         "X-Men '97", "Agatha All Along", "Your Friendly Neighborhood Spider-Man",
         "Daredevil: Born Again", "Ironheart", "Eyes of Wakanda",
         "Marvel Zombies", "Wonder Man"]

results = []
for show in tqdm(shows):
    try:
        url = "https://api.themoviedb.org/3/search/tv"
        params = {
            "api_key": API_KEY,
            "query": show
        }
        response = requests.get(url, params)
        results.append(response.json()["results"][0])
    except:
        try:
            url = "https://api.themoviedb.org/3/search/movie"
            params = {
                "api_key": API_KEY,
                "query": show
            }
            response = requests.get(url, params)
            results.append(response.json()["results"][0])
        except:
            pass

pd.DataFrame(results).to_csv("marvel_shows_tmdb.csv", index = False)