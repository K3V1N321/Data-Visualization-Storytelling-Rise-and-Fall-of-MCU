from tqdm import tqdm
import pandas as pd
import requests
import time

shows = ["WandaVision", "The Falcon and The Winter Soldier", "Loki | Season 1", "What If...? | Season 1", "Hawkeye",
         "Moon Knight", "Ms. Marvel", "I am Groot | Season 1", "She-Hulk: Attorney at Law", "Werewolf By Night",
         "The Guardians of the Galaxy Holiday Special", "Secret Invasion", "I am Groot | Season 2", "Loki | Season 2", "What If...? | Season 2",
         "Echo", "X-Men '97 | Season 1", "Agatha All Along", "What If...? | Season 3", "Your Friendly Neighborhood Spider-Man | Season 1",
         "Daredevil: Born Again | Season 1", "Ironheart", "Eyes of Wakanda", "Marvel Zombies", "Wonder Man"]

phases = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
          5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
          6, 6, 6]

averageRatings = [7.9, 7.1, 8.2, 7.3, 7.4,
                  7.3, 6.2, 6.7, 5.2, 7.1,
                  6.9, 5.8, 6.7, 8.2, 7.3,
                  5.9, 8.7, 7.2, 7.3, 7.5,
                  8, 4.5, 6.2, 7, 7.5]
numberVotes = [412492, 278212, 466867, 159148, 241039,
               307809, 130493, 45726, 207436, 78865,
               107833, 89313, 45726, 466867, 159148,
               48363, 51501, 87138, 159148, 17973,
               87934, 65536, 8999, 21681, 25860]

API_KEY = "def64965d9a7d884c5b1e68e08e70588"

def get_show_data(title, season):
    results = []
    url = f"https://api.themoviedb.org/3/search/tv"
    params = {
        "api_key": API_KEY,
        "query": title
    }
    response = requests.get(url, params=params).json()
    
    data = response["results"][0]
    showId = data["id"]

    time.sleep(1)
    externalIdUrl = f"https://api.themoviedb.org/3/tv/{showId}/external_ids"
    detailsParams = {
        "api_key": API_KEY,
        "query": title
    }

    externalIdsResponse = requests.get(externalIdUrl, params = detailsParams).json()
    imdbId = externalIdsResponse["imdb_id"]

    data["imdb_id"] = imdbId

    time.sleep(1)

    return data


    seasonDetailsUrl = f"https://api.themoviedb.org/3/tv/{showId}/season/{season}"
    detailsParams = {
        "api_key": API_KEY,
        "language": "en-US"
    }
    seasonDetailsResponse = requests.get(seasonDetailsUrl, params = detailsParams).json()
    episodesDetails = seasonDetailsResponse["episodes"]
    time.sleep(1)

    for episode in episodesDetails:
        episodeNumber = episode["episode_number"]
        externalIdUrl = f"https://api.themoviedb.org/3/tv/{showId}/season/{season}/episode/{episodeNumber}/external_ids"
        detailsParams = {
            "api_key": API_KEY,
            "language": "en-US"
        }
        externalIdsResponse = requests.get(externalIdUrl, params = detailsParams).json()
        imdbId = externalIdsResponse["imdb_id"]
        episode["show"] = title
        episode["imdb_id"] = imdbId
        episodeDf = pd.DataFrame([episode])
        episodeDf.rename(columns = {"vote_average": "episode_vote_average", "vote_count": "episode_vote_count"}, inplace = True)
        
        data["season_number"] = episodeDf.loc[0, "season_number"]
        data["episode_number"] = episodeDf.loc[0, "episode_number"]
        data["episode_vote_average"] = episodeDf.loc[0, "episode_vote_average"]
        data["vote_count"] = episodeDf.loc[0, "episode_vote_count"]
        data["imdb_id"] = episodeDf.loc[0, "imdb_id"]
        results.append(data)
        time.sleep(1)
    
    return results

def get_movie_data(title):
    url = f"https://api.themoviedb.org/3/search/movie"
    params = {
        "api_key": API_KEY,
        "query": title
    }
    response = requests.get(url, params=params).json()
    data = response["results"][0]
    time.sleep(1)

    movieId = data["id"]
    detailsUrl = f"https://api.themoviedb.org/3/movie/{movieId}"
    detailsParams = {
        "api_key": API_KEY,
        "language": "en-US"
    }
    detailsResponse = requests.get(detailsUrl, params = detailsParams).json()

    for key in detailsResponse:
        if key not in data:
            data[key] = detailsResponse[key]
    time.sleep(1)

    return data

if __name__ == "__main__":
    results = []
    for i in tqdm(range(len(shows))):
        title = shows[i]
        phase = phases[i]
        splitIndex = title.find("|")
        if splitIndex != -1:
            titleParts = title.split("|")
            show = titleParts[0].strip()
            season = titleParts[1].strip()[-1]
        else:
            show = title
            season = "1"
        
        try:
            result = get_show_data(show, season)
            results.append({"id": result["id"], "title": title, "phase": phase,
                            "release_date": result["first_air_date"], "imdb_id": result["imdb_id"], "imdb_average_rating": None, "imdb_vote_count": None,
                            "backdrop_path": result["backdrop_path"], "poster_path": result["poster_path"],
                            "popularity": result["popularity"], "vote_average": result["vote_average"], "vote_count": result["vote_count"],
                            "overview": result["overview"]})
        except:
            result = get_movie_data(show)
            results.append({"id": result["id"], "title": title, "phase": phase,
                            "release_date": result["release_date"], "imdb_id": result["imdb_id"], "imdb_average_rating": None, "imdb_vote_count": None,
                            "backdrop_path": result["backdrop_path"], "poster_path": result["poster_path"],
                            "popularity": result["popularity"], "vote_average": result["vote_average"], "vote_count": result["vote_count"]})

    pd.DataFrame(results).to_csv("marvel_shows_data.csv", index = False)
        