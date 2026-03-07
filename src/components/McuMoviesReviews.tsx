import { useEffect, useState, useRef} from "react";
import * as d3 from "d3";
import { useResizeObserver, useDebounceCallback } from "usehooks-ts";
import { ComponentSize, Margin } from "../types";
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
    const reviewsRef = useRef<HTMLDivElement> (null);
    const margin: Margin = { top: 60, right: 40, bottom: 40, left: 60 };
    const [size, setSize] = useState<ComponentSize>({width: 0, height: 0});
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [filteredMovies, setFilteredMoves] = useState<Movie[]>([]);
    const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);

    useResizeObserver({ ref: reviewsRef as React.RefObject<HTMLDivElement>, onResize });
    
    useEffect(() => {
        const loadData = async () => {
            const movieData = (await d3.csv("./data/marvel_movies_tmdb.csv"))
            .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
            const reviewData = await d3.csv("./data/marvel_movies_imdb_reviews.csv");
            let parsedMovies: Movie[] = [];
            let parsedReviews: Review[] = [];
            for (const movie of movieData) {
                if (movie.title == "The Incredible Hulk") {
                  continue;
                }
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
            setFilteredMoves([]);
            setFilteredReviews([]);
        }
        else {
            const moviesFromSelectedYear = movies.filter((movie) => movie.releaseYear == selectedReviewsYear)
            .sort((a, b) => a.releaseYear - b.releaseYear);
            const movieTitles = moviesFromSelectedYear.map((movie) => movie.title);

            let allFilteredReviews: Review[] = []
            for (const title of movieTitles) {
                let movieFilteredReviews = reviews.filter((review) => review.movie == title && review.reviewRating != 0);
                if (movieFilteredReviews.length > 8) {
                    allFilteredReviews = allFilteredReviews.concat(movieFilteredReviews.slice(0, 8));
                }
                else {
                    allFilteredReviews = allFilteredReviews.concat(movieFilteredReviews);
                }
            }
            setFilteredMoves(moviesFromSelectedYear);
            setFilteredReviews(allFilteredReviews)
        }
    }, [selectedReviewsYear])

    useEffect(() => {
        if (size.width == 0 || size.height == 0) {
          return;
        }

        d3.select("#reviews-section-containter").selectAll("*").remove();

        generateReviews();
    }, [filteredMovies, filteredReviews, size])

    function generateReviews() {
        const container = d3.select("#reviews-section-containter");
        let title = "MCU Movies IMDB Reviews";
        if (selectedReviewsYear != null) {
            title = `${selectedReviewsYear} MCU Movies IMDB Reviews`;
        }
        // Add title
        container.append("div")
        .attr("id", "reviews-title")
        .style("text-anchor", "middle")
        .style("font-size", '15px')
        .style("font-weight", 900)
        .text(title);

        container.append("div")
        .style("font-size", "12px")
        .html(`Click a point on the line chart to view the movies released that year. 
            Click a movie to display the top voted IMDB reviews for that movie.
            Click a review to display the body of the review.
            `
        )



        // Container for all reviews
        const reviewsListContainer = container.append("div")
        .attr("id", "reviews-list-container")
        .style("width", "100%")
        .style("flex", 1)
        .style("overflow-y", "auto")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "12px");

        // Create blocks for each movie
        const movieElements = reviewsListContainer.selectAll("div.movie-item")
        .data(filteredMovies)
        .enter()
        .append("div")
        .attr("class", "movie-item")
        .style("width", "100%")
        .style("box-sizing", "border-box")
        .style("border", "2px solid black")
        .style("border-radius", "8px")
        .style("padding", "12px")
        .style("backgroundColor", "#fafafa")
        .style("display", "block")
        .style("font-size", '13px')
        .html((dataPoint) => `<strong>${dataPoint.title}</strong>
        <span style = "margin-left: 20px;">
        Average Rating: <strong>${dataPoint.imdbAverageRating}/10</strong>
        </span>`)
        .on("mouseover", function(event) {
            d3.select(this)
            .style("cursor", "pointer");
        })
        // Toggle if review titles are shown
        .on("click", function(event) {
            const reviewTitlesContainer = d3.select(this).select(".movie-review-titles-container");
            if (reviewTitlesContainer.style("display") == "none") {
                reviewTitlesContainer.raise();
                reviewTitlesContainer
                .style("gap", "12px")
                .style("display", "flex");  
            }
            else {
                reviewTitlesContainer.lower();
                reviewTitlesContainer.style("display", "none"); 
            }
        })
        
        // Loop through each movie block
        for (const element of movieElements) {
            const title = d3.select(element).data()[0]["title"];
            const movieReviews = filteredReviews.filter((review) => review.movie == title).sort((a, b) => a.reviewRating - b.reviewRating);
            console.log(movieReviews)
            // Container for review title blocks
            const reviewTitlesContainers = d3.select(element)        
            .append("div")
            .attr("class", "movie-review-titles-container")
            .style("width", "90%")
            .style("flex", 1)
            .style("overflow-y", "auto")
            .style("flex-direction", "column")
            .style("display", "none")
            
            // Create review title block for each review
            const reviewTitleElements = reviewTitlesContainers.selectAll("div.review-title-item")
            .data(movieReviews)
            .enter()
            .append("div")
            .attr("class", "review-title-item")
            .style("width", "100%")
            .style("box-sizing", "border-box")
            .style("border", "2px solid black")
            .style("border-radius", "8px")
            .style("padding", "12px")
            .style("backgroundColor", "#fafafa")
            .style("display", "block")
            .style("font-size", "13px")
            .html((dataPoint) => `<strong>${dataPoint.reviewTitle}</strong><br/>
            <span>${dataPoint.author}</span>
            <span style = "margin-left: 20px">${dataPoint.date}</span>
            <br/>
            <span>Rating: <strong>${dataPoint.reviewRating}/10</strong></span>
            <span style = "margin-left: 20px">Likes: ${dataPoint.likes}</span>
            <span style = "margin-left: 20px">Dislikes: ${dataPoint.dislikes}</span>`)
            // Toggle if body of review is shown
            .on("click", function(event) {
                event.stopPropagation();
                const reviewBody = d3.select(this).select(".review-body");
                if (reviewBody.style("display") == "none") {
                    reviewBody.style("display", "block");  
                }
                else {
                    reviewBody.style("display", "none"); 
                }
            })
            
            // Generate Review body for each review
            for (const reviewElement of reviewTitleElements) {
                const reviewBody = d3.select(reviewElement).data()[0]["review"];
                d3.select(reviewElement)
                .append("div")
                .attr("class", "review-body")
                .style("font-size", '13px')
                .text(reviewBody)
                .style("display", "none")
            }
        }
    }

    return (
      <>
          <div ref = {reviewsRef} id = "reviews-section-containter" style = {{width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: "6px"}}>
          </div>
      </>
  )
}