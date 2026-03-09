import pandas as pd
import ast

def getCollectionName(collectionData):
    if pd.isna(collectionData):
        return collectionData
    else:
        return ast.literal_eval(collectionData)["name"]
data = pd.read_csv("./data/top10_movies_2008_2025.csv")
genresData = []
productionCompaniesData = []
productionCountriesData = []
spokenLanguagesData = []
isMarvelData = []
for i in range(len(data)):
    collection = data.loc[i, "belongs_to_collection"]
    genresInfo = data.loc[i, "genres"]
    productionCompaniesInfo = data.loc[i, "production_companies"]
    productionCountriesInfo = data.loc[i, "production_countries"]
    spokenLanguagesInfo = data.loc[i, "spoken_languages"]
    

    if not pd.isna(collection):
        data.loc[i, "belongs_to_collection"] = ast.literal_eval(collection)["name"]
    if pd.isna(genresInfo):
        genresData.append("None")
    else:
        genres = ast.literal_eval(genresInfo)
        for j in range(len(genres)):
            genres[j] = genres[j]["name"]
        genresData.append(genres)

    if pd.isna(productionCompaniesInfo):
        productionCompaniesData.append("None")
    else:
        productionCompanies = ast.literal_eval(productionCompaniesInfo)
        for j in range(len(productionCompanies)):
            productionCompanies[j] = productionCompanies[j]["name"]
        if "Marvel Studios" in productionCompanies:
            isMarvelData.append("true")
        else:
            isMarvelData.append("false")
        productionCompaniesData.append(productionCompanies)

    if pd.isna(productionCountriesInfo):
        productionCountriesData.append("None")
    else:
        productionCountries = ast.literal_eval(productionCountriesInfo)
        for j in range(len(productionCountries)):
            productionCountries[j] = productionCountries[j]["name"]
        productionCountriesData.append(productionCountries)

    if pd.isna(spokenLanguagesInfo):
        spokenLanguagesData.append("None")
    else:
        spokenLanguages = ast.literal_eval(spokenLanguagesInfo)
        for j in range(len(spokenLanguages)):
            spokenLanguages[j] = spokenLanguages[j]["english_name"]
        spokenLanguagesData.append(spokenLanguages)
    
data["genres"] = pd.Series([[]] * len(data))
data["production_companies"] = pd.Series([[]] * len(data))
data["production_countries"] = pd.Series([[]] * len(data))
data["spoken_languages"] = pd.Series([[]] * len(data))
data["genres"] = genresData  
data["production_companies"] = productionCompaniesData
data["production_countries"] = productionCountriesData
data["spoken_languages"] = spokenLanguagesData

data["is_marvel"] = isMarvelData
data.to_csv("top10_movies_2008_2025.csv", index = False)