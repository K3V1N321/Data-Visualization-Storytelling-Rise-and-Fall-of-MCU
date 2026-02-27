import {useEffect, useRef, useState} from "react";
import * as d3 from "d3"
import { useResizeObserver, useDebounceCallback } from "usehooks-ts";
import { ComponentSize, Margin } from "../types";
import { isEmpty } from "lodash";


type Movie = {
    id: string
    title: string
    releaseYear: number
    imdbAverageRating: number
    numberVotes: number
};

type YearlyAverageRating = {
    year: number
    averageRating: number
}


export default function McuRatingsLineChart({selectedReviewsYear, setReviewsYear}) {
    const lineRef = useRef<HTMLDivElement> (null);
    const margin: Margin = { top: 40, right: 40, bottom: 40, left: 40 }
    const [size, setSize] = useState<ComponentSize>({width: 0, height: 0});
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const [movies, setMovies] = useState<Movie[]>([]);

    const normalTextFontSize = 13;
    const pointRadius = 5;
    const pointStrokeWidth  = 1.5;
    const pointFill = "#DBA506"

    useResizeObserver({ ref: lineRef as React.RefObject<HTMLDivElement>, onResize });

    useEffect(() => {
        // Read dataset for top 10 grossing movies
        const loadData = async() => {
            const data = await d3.csv("./data/marvel_movies_tmdb.csv")
            let moviesData: Movie[] = [];
            for (const dataPoint of data) {
                const movieData: Movie = {
                    id: dataPoint.id,
                    title: dataPoint.title,
                    releaseYear: Number(dataPoint.release_date.split("-")[0]),
                    imdbAverageRating: Number(dataPoint.imdb_average_rating),
                    numberVotes: Number(dataPoint.imdb_vote_count)
                }
                moviesData.push(movieData);
            }
            setMovies(moviesData);            
        }

        loadData();
    }, []);

    useEffect(() => {
        if (isEmpty(movies)) {
            return;
        }
        if (size.width == 0 || size.height == 0) {
            return;
        }
        
        d3.select("#average-ratings-svg").selectAll("*").remove();

        generateLineChart();
    }, [movies, size]);

    function generateLineChart() {
        const container = d3.select("#average-ratings-container");
        const svg = d3.select("#average-ratings-svg");

        container.append("div")
        .attr('id', 'average-ratings-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('z-index', '20')
        .style('background', 'rgba(255,255,255,0.98)')
        .style('border', '1px solid rgba(0,0,0,0.12)')
        .style('border-radius', '12px')
        .style('box-shadow', '0 10px 22px rgba(0,0,0,0.12)')
        .style('padding', '10px')
        .style('max-width', '260px')
        .style("visibility", "hidden")
        .style("opacity", 0)
        .style("font-size", "13px");

        let formattedData: YearlyAverageRating[] = [];
        const years = [... new Set(movies.map((movie) => movie.releaseYear))].sort((a, b) => a - b);
        for (const year of years) {
            const yearMovies = movies.filter((movie) => movie.releaseYear == year);
            const dataPoint: YearlyAverageRating = {
                year: year,
                averageRating: d3.mean(yearMovies, (dataPoint) => dataPoint.imdbAverageRating)
            };
            formattedData.push(dataPoint);
        }
        
        const xScale = d3.scaleBand()
        .domain(formattedData.map((dataPoint) => dataPoint.year))
        .range([margin.left, size.width - margin.right]);

        const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${size.height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

        // Generate x-axis label
        svg.append("g")
        .attr("transform", `translate(${margin.left + ((size.width - margin.left - margin.right) / 2)}, ${size.height})`)
        .append("text")
        .text("Year")
        .style("font-size", `${normalTextFontSize}px`);

        const yScale = d3.scaleLinear()
        .domain([0, d3.max(formattedData.map((dataPoint) => dataPoint.averageRating))])
        .range([size.height - margin.bottom, margin.top]);

        const yAxis = svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

        // Generte y-axis label
        svg.append("g")
        .attr("transform", `translate(${margin.left / 2}, ${margin.top + ((size.height - margin.top - margin.bottom) / 2)}) rotate(-90)`)
        .append("text")
        .text("Average Rating")
        .attr("text-anchor", "middle")
        .style("font-size", `${normalTextFontSize}px`);

        const lineGenerator = d3.line()
        .x((dataPoint) => xScale(dataPoint.year))
        .y((dataPoint => yScale(dataPoint.averageRating)))

        const pathContainer = svg.append("g")
        .attr("id", "path-container");

        pathContainer.append("path")
        .datum(formattedData)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

        const pointsContainer = svg.append("g")
        .attr("id", "average-rating-points-container")

        pointsContainer.selectAll("circle")
        .data(formattedData)
        .enter()
        .append("circle")
        .attr("id", (dataPoint) => `average-rating-${dataPoint.year}`)
        .attr("cx", (dataPoint) => xScale(dataPoint.year))
        .attr("cy", (dataPoint) => yScale(dataPoint.averageRating))
        .attr("r", pointRadius)
        .attr("stroke", "black")
        .attr("stroke-width", pointStrokeWidth)
        .style("fill", pointFill)
        .on("mouseover", function(event, dataPoint) {
            d3.select(this).style("cursor", "pointer");
            d3.select(this)
            .transition()
            .duration(300)
            .ease(d3.easeCubicInOut)
            .attr("r", pointRadius + 3)
            .attr("stroke-width", pointStrokeWidth + 2);

            d3.select("#average-ratings-tooltip")
            .html(`${dataPoint.averageRating.toFixed(2)}`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1)
            .style("visibility", "visible");
        })
        .on("mousemove", function(event) {
            d3.select("#average-ratings-tooltip")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
        })
        .on("mouseout", function(event, dataPoint) {
            if (dataPoint.year != selectedReviewsYear) {
                d3.select(this)
                .transition()
                .duration(300)
                .ease(d3.easeCubicInOut)
                .attr("r", pointRadius)
                .attr("stroke-width", pointStrokeWidth)
            }
            d3.select("#average-ratings-tooltip")
            .style("opacity", 0)
            .style("visibility", "hidden");
        })
        .on("click", function(event, dataPoint) {
            if (selectedReviewsYear == dataPoint.year) {
                selectedReviewsYear = null;
                setReviewsYear(null);
                d3.select(this)
                .transition()
                .duration(300)
                .ease(d3.easeCubicInOut)
                .attr("r", pointRadius)
                .attr("stroke-width", pointStrokeWidth)
            }
            else {
                if (selectedReviewsYear != null) {
                    d3.select(`#average-rating-${selectedReviewsYear}`)
                    .transition()
                    .duration(300)
                    .ease(d3.easeCubicInOut)
                    .attr("r", pointRadius)
                    .attr("stroke-width", pointStrokeWidth)
                }
                selectedReviewsYear = dataPoint.year;
                setReviewsYear(dataPoint.year);
            }
            
        })

    }

    return (
        <>
            <div ref = {lineRef} id = "average-ratings-container" style = {{width: "100%", height: "100%"}}>
                <svg id = "average-ratings-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}