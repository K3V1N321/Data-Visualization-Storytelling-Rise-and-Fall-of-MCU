import pandas as pd

# tmdb_data = pd.read_csv("marvel_shows_tmdb.csv")
# cur_data = pd.read_csv("./data/marvel_shows_data.csv")


# for i in range(len(tmdb_data)):
#     if pd.isna(tmdb_data.loc[i, "name"]):
#         tmdb_data.loc[i, "name"] = tmdb_data.loc[i, "title"]

# tmdb_data["name"] = tmdb_data["name"].apply(str.lower)

# for i in range(len(cur_data)):
#     title = cur_data.loc[i, "title"].lower()
#     if "|" in title:
#         title = title.split("|")[0].strip()
    
#     tmdb_show_data = tmdb_data.loc[tmdb_data["name"] == title].reset_index(drop = True)
#     cur_data.loc[i, "backdrop_path"] = tmdb_show_data.loc[0, "backdrop_path"]
#     cur_data.loc[i, "poster_path"] = tmdb_show_data.loc[0, "poster_path"]
#     cur_data.loc[i, "popularity"] = tmdb_show_data.loc[0, "popularity"]
#     cur_data.loc[i, "vote_average"] = tmdb_show_data.loc[0, "vote_average"]
#     cur_data.loc[i, "vote_count"] = tmdb_show_data.loc[0, "vote_count"]

# print(cur_data["poster_path"])

# cur_data.to_csv("marvel_shows_data.csv", index = False)

data = pd.read_csv("./data/marvel_movies_imdb_reviews.csv")
indices = data.loc[data["title"] == "Thunderbolts"].index
data.loc[indices, "title"] = "Thunderbolts*"
data.to_csv("marvel_movies_imdb_reviews.csv", index = False)
    
