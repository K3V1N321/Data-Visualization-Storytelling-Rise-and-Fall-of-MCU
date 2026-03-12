from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions
from tqdm import tqdm
import kagglehub
import os
import pandas as pd
import time

MOVIE_TITLES = [
    'Iron Man', 'Iron Man 2', 'Iron Man 3', 'The Incredible Hulk',
    'The Avengers', 'Avengers: Age of Ultron', 'Avengers: Infinity War', 'Avengers: Endgame'
    'Guardians of the Galaxy', 'Guardians of the Galaxy Vol. 2'
    'Captain America: The First Avenger', 'Captain America: The Winter Soldier', 'Captain America: Civil War', 'Black Panther', 'Black Panther: Wakanda Forever'
    'Spider-Man: Homecoming', 'Spider-Man: Far From Home', 'Spider-Man: No Way Home', 'Doctor Strange'
    'Thor', 'Thor: The Dark World', 'Thor: Ragnarok', 'Thor: Love and Thunder',
    'Ant-Man', 'Captain Marvel', 'Ant-Man and the Wasp',
    'Black Widow', 'Shang-Chi and the Legend of the Ten Rings',
    'Doctor Strange in the Multiverse of Madness', 'Eternals',
    'Guardians of the Galaxy Vol. 3', 'Ant-Man and the Wasp: Quantumania', 'Deadpool & Wolverine',
    'The Marvels', 'The Fantastic 4: First Steps', 'Thunderbolts*', 'Captain America: Brave New World'
]

def get_rating(reviewContent):
    try:
        rating = reviewContent.find_element(By.CLASS_NAME, "sc-fa7e37dc-4").find_element(by = By.CLASS_NAME, value = "ipc-rating-star").find_element(by = By.CLASS_NAME, value = "ipc-rating-star--rating").text
        return rating
    except:
        return "None"
    
def get_title(reviewContent):
    try:
        reviewTitle = reviewContent.find_element(By.CSS_SELECTOR, ".ipc-title .ipc-title-link-wrapper .ipc-title__text").text
        return reviewTitle
    except:
        return "None"
    

def get_review_text(reviewContent, driver, currentReviewIndex):
    try:
        reviewText = reviewContent.find_element(by = By.CLASS_NAME, value = "ipc-overflowText").find_element(by = By.CLASS_NAME, value = "ipc-overflowText--children").find_element(by = By.CLASS_NAME, value = "ipc-html-content").find_element(by = By.CLASS_NAME, value = "ipc-html-content-inner-div").text
    except:
        # If the review is behind a spoiler button
        try:
            spolierButton = reviewContent.find_element(by = By.CLASS_NAME, value = "ipc-btn")

            # Click spoiler button
            driver.execute_script("arguments[0].click();", spolierButton)
            time.sleep(0.5)

            # Try to get review text again after clicking spoiler button updates DOM
            updatedReviewsPage = driver.find_elements(by = By.TAG_NAME, value = "article")
            currentReview = updatedReviewsPage[currentReviewIndex]
            currentReviewContentDiv = currentReview.find_element(by = By.TAG_NAME, value = "div").find_element(by = By.CLASS_NAME, value = "ipc-list-card__content")
            reviewText = currentReviewContentDiv.find_element(by = By.CSS_SELECTOR, value = "[data-testid='review-spoiler-content']").find_element(by = By.CLASS_NAME, value = "ipc-html-content").find_element(by = By.CLASS_NAME, value = "ipc-html-content-inner-div").text
        except:
            reviewText = "None"
    
    return reviewText

def get_likes_and_dislikes(reviewCardDiv):
    voteContainer = reviewCardDiv.find_element(by = By.CLASS_NAME, value = "ipc-list-card__actions").find_element(by = By.TAG_NAME, value = "div").find_element(by = By.CLASS_NAME, value = "ipc-voting")
    voteSpans = voteContainer.find_elements(by = By.CLASS_NAME, value = "ipc-voting__label")
    numLikes = voteSpans[0].find_element(by = By.CLASS_NAME, value = "ipc-voting__label__count").text
    numDislikes = voteSpans[1].find_element(by = By.CLASS_NAME, value = "ipc-voting__label__count").text

    return numLikes, numDislikes

def get_author_and_date(review):
    reviewAuthorDiv = review.find_element(by = By.CSS_SELECTOR, value = "[data-testid='reviews-author']")
    author = reviewAuthorDiv.find_element(by = By.TAG_NAME, value = "ul").find_element(by = By.TAG_NAME, value = "li").find_element(by = By.TAG_NAME, value = "a").text
    date = reviewAuthorDiv.find_element(by = By.TAG_NAME, value = "ul").find_element(by = By.CLASS_NAME, value = "review-date").text

    return author, date

def scrape_reviews(media, outputFileName):
    driver = webdriver.Chrome()
    driver.set_page_load_timeout(30)

    wait = WebDriverWait(driver = driver, timeout = 30)

    titles = []
    ids = []
    reviewRatings = []
    reviewTitles = []
    reviewTexts = []
    likes = []
    dislikes = []
    authors = []
    dates = []

    for i in tqdm(range(len(media)), desc = "Scraping Reviews"):
        title = media.loc[i, "title"]
        id = media.loc[i, "imdb_id"]
  
        url = f"https://www.imdb.com/title/{id}/reviews/?sort=num_votes%2Cdesc"

        # Try 2 times to access webpage
        try:
            driver.get(url)
            time.sleep(3)
            wait.until(expected_conditions.presence_of_all_elements_located((By.TAG_NAME, "article")))
        except:
            try:
                driver.get(url)
                time.sleep(3)
                wait.until(expected_conditions.presence_of_all_elements_located((By.TAG_NAME, "article")))
            # Can't access webpage, move on to next movie
            except:
                titles.append(title)
                ids.append(id)
                reviewRatings.append("None")
                reviewTitles.append("None")
                reviewTexts.append("None")
                likes.append("None")
                dislikes.append("None")
                authors.append("None")
                dates.append("None")
                continue


        # Get review elements
        try:
            reviews = driver.find_elements(by = By.TAG_NAME, value = "article")
        # Movie does not have reviews
        except:
            titles.append(title)
            ids.append(id)
            reviewRatings.append("None")
            reviewTitles.append("None")
            reviewTexts.append("None")
            likes.append("None")
            dislikes.append("None")
            authors.append("None")
            dates.append("None")
            continue


        for j in range(len(reviews)):
            review = reviews[j]
            reviewCardDiv = review.find_element(by = By.CSS_SELECTOR, value = "[data-testid='review-card-parent']")
            reviewContent = reviewCardDiv.find_element(by = By.CLASS_NAME, value = "ipc-list-card__content")

            rating = get_rating(reviewContent)

            reviewTitle = get_title(reviewContent)
            
            reviewText = get_review_text(reviewContent, driver, j)

            numLikes, numDislikes = get_likes_and_dislikes(reviewCardDiv)

            author, date = get_author_and_date(review)
                
            titles.append(title)
            ids.append(id)
            reviewRatings.append(rating)
            reviewTitles.append(reviewTitle)
            reviewTexts.append(reviewText)
            likes.append(numLikes)
            dislikes.append(numDislikes)
            authors.append(author)
            dates.append(date)
    
        reviewDF = {"title": titles, "imdb_id": ids, "author": authors, "date": dates,
                    "review_rating": reviewRatings, "review_title": reviewTitles, "review": reviewTexts,
                    "likes": likes, "dislikes": dislikes}
        pd.DataFrame(reviewDF).to_csv(outputFileName, index = False)

        time.sleep(3)

    driver.quit()


if __name__ == "__main__":
    # Download TMDB dataset
    path = kagglehub.dataset_download("asaniczka/tmdb-movies-dataset-2023-930k-movies")
    data = pd.read_csv(os.path.join(path, "TMDB_movie_dataset_v11.csv"))
    data = data.drop_duplicates(subset = ["title"])

    # Filter for only MCU movies
    marvelMovies = data[data["title"].isin(MOVIE_TITLES)].reset_index(drop=True)
    
    # Get IMDb ratings of MCU movies (downloaded imdb data)
    ratings = pd.read_csv("title.ratings.tsv", delimiter = "\t")
    for i in range(len(marvelMovies)):
        try:
            imdbId = marvelMovies.loc[i, "imdb_id"]

            index = ratings.loc[ratings["tconst"] == imdbId].index[0]
            marvelMovies.loc[i, "imdb_average_rating"] = ratings.loc[index, "averageRating"]
            marvelMovies.loc[i, "imdb_vote_count"] = ratings.loc[index, "numVotes"]
        except:
            continue
    marvelMovies.to_csv("marvel_movies_tmdb.csv", index = False)

    marvelMovies = pd.read_csv("marvel_movies_tmdb.csv")
    scrape_reviews(marvelMovies, "marvel_movies_imdb_reviews.csv")