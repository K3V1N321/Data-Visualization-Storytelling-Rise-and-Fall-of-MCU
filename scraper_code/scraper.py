from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions
from tqdm import tqdm
import pandas as pd
import time

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
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1920,1080")
    driver = webdriver.Chrome()
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
    marvelMovies = pd.read_csv("marvel_movies.csv")
    scrape_reviews(marvelMovies, "marvel_movies_imdb_reviews.csv")

# if __name__ == "__main__":
#     options = Options()
#     options.add_argument("--headless=new")
#     options.add_argument("--disable-gpu")
#     options.add_argument("--no-sandbox")
#     options.add_argument("--window-size=1920,1080")
#     driver = webdriver.Chrome()
#     wait = WebDriverWait(driver = driver, timeout = 30)

#     titles = []
#     ids = []
#     reviewRatings = []
#     reviewTitles = []
#     reviewTexts = []
#     likes = []
#     dislikes = []
#     authors = []
#     dates = []

#     marvelMovies = pd.read_csv("marvel_movies.csv")
#     for i in tqdm(range(len(marvelMovies)), desc = "Scraping Reviews"):
#         title = marvelMovies.loc[i, "title"]
#         id = marvelMovies.loc[i, "imdb_id"]
  
#         url = f"https://www.imdb.com/title/{id}/reviews/?sort=num_votes%2Cdesc"

#         # Try 2 times to access webpage
#         try:
#             driver.get(url)
#             time.sleep(3)
#             wait.until(expected_conditions.presence_of_all_elements_located((By.TAG_NAME, "article")))
#         except:
#             try:
#                 driver.get(url)
#                 time.sleep(3)
#                 wait.until(expected_conditions.presence_of_all_elements_located((By.TAG_NAME, "article")))
#             # Can't access webpage, move on to next movie
#             except:
#                 titles.append(title)
#                 ids.append(id)
#                 reviewRatings.append("None")
#                 reviewTitles.append("None")
#                 reviewTexts.append("None")
#                 likes.append("None")
#                 dislikes.append("None")
#                 authors.append("None")
#                 dates.append("None")
#                 continue


#         # Get review elements
#         try:
#             reviews = driver.find_elements(by = By.TAG_NAME, value = "article")
#         # Movie does not have reviews
#         except:
#             titles.append(title)
#             ids.append(id)
#             reviewRatings.append("None")
#             reviewTitles.append("None")
#             reviewTexts.append("None")
#             likes.append("None")
#             dislikes.append("None")
#             authors.append("None")
#             dates.append("None")
#             continue


#         for j in range(len(reviews)):
#             review = reviews[j]
#             reviewCardDiv = review.find_element(by = By.CSS_SELECTOR, value = "[data-testid='review-card-parent']")
#             reviewContent = reviewCardDiv.find_element(by = By.CLASS_NAME, value = "ipc-list-card__content")

#             rating = get_rating(reviewContent)

#             reviewTitle = get_title(reviewContent)
            
#             reviewText = get_review_text(reviewContent, driver, j)

#             numLikes, numDislikes = get_likes_and_dislikes(reviewCardDiv)

#             author, date = get_author_and_date(review)
                
#             titles.append(title)
#             ids.append(id)
#             reviewRatings.append(rating)
#             reviewTitles.append(reviewTitle)
#             reviewTexts.append(reviewText)
#             likes.append(numLikes)
#             dislikes.append(numDislikes)
#             authors.append(author)
#             dates.append(date)
    
#         reviewDF = {"title": titles, "imdb_id": ids, "author": authors, "date": dates,
#                     "review_rating": reviewRatings, "review_title": reviewTitles, "review": reviewTexts,
#                     "likes": likes, "dislikes": dislikes}
#         pd.DataFrame(reviewDF).to_csv("marvel_reviews.csv", index = False)

#         time.sleep(3)

#     driver.quit()
