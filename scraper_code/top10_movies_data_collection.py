from tqdm import tqdm
import pandas as pd
import requests
import time

API_KEY = "def64965d9a7d884c5b1e68e08e70588"

def get_top_revenue_movies(year):
    url = f"https://api.themoviedb.org/3/discover/movie"
    params = {
        "api_key": API_KEY,
        "primary_release_year": year,
        "include_adult": "false",
        "language": "en-US",
        "sort_by": "revenue.desc",
        "page": 1
    }
    response = requests.get(url, params=params).json()
    top10Movies = response["results"][0:10]

    time.sleep(1)
    for i in range(len(top10Movies)):
        movieId = top10Movies[i]["id"]
        detailsUrl = f"https://api.themoviedb.org/3/movie/{movieId}"
        detailsParams = {"api_key": API_KEY, "language": "en-US"}
        detailsResponse = requests.get(detailsUrl, params = detailsParams).json()

        for key in detailsResponse:
            if key not in top10Movies[i]:
                top10Movies[i][key] = detailsResponse[key]
        time.sleep(1)

    return top10Movies

if __name__ == "__main__":
    results = []
    for i in tqdm(range(2008, 2026)):
        top10Movies = get_top_revenue_movies(i)
        results = results + top10Movies
    pd.DataFrame(results).to_csv("top10_movies.csv", index = False)
