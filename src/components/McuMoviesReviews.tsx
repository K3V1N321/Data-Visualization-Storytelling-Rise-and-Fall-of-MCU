import { useEffect, useState, useRef} from "react";
import * as d3 from "d3";
import { filter } from "lodash";

type Movie = {
    id: string;
    title: string;
    releaseYear: number;
    imdbAverageRating: number;
    numberVotes: number;
};

type Review = {
    movie: string;
    imdbId: string;
    author: string;
    date: string;
    reviewRating: number;
    reviewTitle: string;
    review: string;
    likes: string;
    dislikes: string;
};

export default function McuMoviesReviews({ selectedReviewsYear }) {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
    
    useEffect(() => {
        const loadData = async () => {
            const movieData = await d3.csv("./data/marvel_movies_tmdb.csv");
            const reviewData = await d3.csv("./data/marvel_movies_imdb_reviews.csv");
            let parsedMovies: Movie[] = [];
            let parsedReviews: Review[] = [];

            for (const movie of movieData) {
                const parsedMovie: Movie = {
                    id: movie.id,
                    title: movie.title,
                    releaseYear: Number(movie.release_date.split("-")[0]),
                    imdbAverageRating: Number(movie.imdb_average_rating),
                    numberVotes: Number(movie.imdb_vote_count),
                }
                parsedMovies.push(parsedMovie);
            }

            for (const review of reviewData) {
                const parsedReview: Review = {
                    movie: review.title,
                    imdbId: review.imdb_id,
                    author: review.author,
                    date: review.date,
                    reviewRating: Number(review.review_rating),
                    reviewTitle: review.review_title,
                    review: review.review,
                    likes: review.likes,
                    dislikes: review.dislikes,
                }
                parsedReviews.push(parsedReview)
            }
            setMovies(parsedMovies);
            setReviews(parsedReviews);
        };

        loadData();
    }, []);

    useEffect(() => {
        if (selectedReviewsYear == null) {
            setFilteredReviews([]);
        }
        else {
            const moviesFromYear = movies.filter((movie) => movie.releaseYear == selectedReviewsYear);
            const movieTitles = moviesFromYear.map((movie) => movie.title);

            let allFilteredReviews: Review[] = []
            for (const title of movieTitles) {
                let movieFilteredReviews = reviews.filter((review) => review.movie == title);
                if (movieFilteredReviews.length > 8) {
                    allFilteredReviews = allFilteredReviews.concat(movieFilteredReviews.slice(0, 8));
                }
                else {
                    allFilteredReviews = allFilteredReviews.concat(movieFilteredReviews);
                }
            }
            setFilteredReviews(allFilteredReviews)
        }
        
    }, [movies, reviews, selectedReviewsYear])


  return (
    <>
      <h3>
        {selectedReviewsYear
          ? `${selectedReviewsYear} MCU Movies IMDB Reviews`
          : "MCU Movies IMDB Reviews"}
      </h3>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingRight: "8px",
        }}
      >
        {filteredReviews.map((review, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              padding: "12px",
              backgroundColor: "#fafafa",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <strong>{review.movie}</strong>
            <div>Title: {review.reviewTitle}</div>
            <div>Rating: {review.reviewRating}</div>
            <div>Likes: {review.likes}</div>
            <div>Dislikes: {review.dislikes}</div>
            <div>Date: {review.date}</div>
            <div>{review.review}</div>
          </div>
        ))}
      </div>
    </>
  );
}