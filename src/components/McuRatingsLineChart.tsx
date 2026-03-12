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

type YearlyRatingData = {
    year: number
    averageRating: number
    maxRating: number
    minRating: number
}


export default function McuRatingsLineChart({selectedReviewsYear, setReviewsYear}) {
    const lineRef = useRef<HTMLDivElement> (null);
    const margin: Margin = { top: 45, right: 40, bottom: 40, left: 60 }
    const [size, setSize] = useState<ComponentSize>({width: 0, height: 0});
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const [movies, setMovies] = useState<Movie[]>([]);
    const container = d3.select("#average-ratings-container");
    const svg = d3.select("#average-ratings-svg");
    const ratingCapWidth = 10;

    // Tooltip for points
    const tooltipElement = container.selectChild("#average-ratings-tooltip")
    if (tooltipElement.empty()) {
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
    }
    

    const titleGraphPadding = 30;
    const plotTopPadding = 12;
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
                if (dataPoint.title == "The Incredible Hulk") {
                    continue;
                }
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

    function highlightPoints(year) {
        d3.select(`#average-rating-${year}`)
        .transition()
        .duration(300)
        .ease(d3.easeCubicInOut)
        .attr("r", pointRadius + 3)
        .attr("stroke-width", pointStrokeWidth + 2);
    
        d3.select(`#average-profit-${year}`)
        .transition()
        .duration(300)
        .ease(d3.easeCubicInOut)
        .attr("r", pointRadius + 3)
        .attr("stroke-width", pointStrokeWidth + 2);
    }
    
    function resetHighlightedPoints(year) {
        d3.select(`#average-rating-${year}`)
        .transition()
        .duration(300)
        .ease(d3.easeCubicInOut)
        .attr("r", pointRadius)
        .attr("stroke-width", pointStrokeWidth);
    
        d3.select(`#average-profit-${year}`)
        .transition()
        .duration(300)
        .ease(d3.easeCubicInOut)
        .attr("r", pointRadius)
        .attr("stroke-width", pointStrokeWidth);
    }

    useEffect(() => {
        const selectedPoints = d3.selectAll(".average-rating.point-selected");
        // No previously selected point
        if (selectedPoints.size() == 0) {
            // Highlight selected point
            d3.select(`#average-rating-${selectedReviewsYear}`).attr("class", "average-rating point-selected");
            highlightPoints(selectedReviewsYear);
        }
        else {
            const previousSelectedYear = selectedPoints.data()[0].year;
            if (previousSelectedYear != selectedReviewsYear) {
                // Unhighlight previously selected point
                selectedPoints.attr("class", "average-rating point");
                resetHighlightedPoints(previousSelectedYear)

                // Highlight selected point
                d3.select(`#average-rating-${selectedReviewsYear}`).attr("class", "average-rating point-selected");
                highlightPoints(selectedReviewsYear);
            }
            else {
                // Unhighlight previously selected point
                selectedPoints.attr("class", "average-rating point");
                resetHighlightedPoints(previousSelectedYear)
            }
        }
    }, [selectedReviewsYear])

    function generateLineChart() {
        let formattedData: YearlyRatingData[] = [];
        const years = [... new Set(movies.map((movie) => movie.releaseYear))].sort((a, b) => a - b);
        for (const year of years) {
            const yearMovies = movies.filter((movie) => movie.releaseYear == year);
            const dataPoint: YearlyRatingData = {
                year: year,
                averageRating: d3.mean(yearMovies, (dataPoint) => dataPoint.imdbAverageRating),
                maxRating: d3.max(yearMovies, (dataPoint) => dataPoint.imdbAverageRating),
                minRating: d3.min(yearMovies, (dataPoint) => dataPoint.imdbAverageRating),

            };
            formattedData.push(dataPoint);
        }


        // Get years for x-axis ticks
        const minYear: number = d3.min(movies.map((movie) => movie.releaseYear));
        const maxYear: number = d3.max(movies.map((movie) => movie.releaseYear));
        let allYears: number[] = [];
        for (let i = minYear; i < maxYear + 1; i++) {
            allYears.push(i);
        }
        
        const xScale = d3.scaleBand()
        .domain(allYears)
        .range([margin.left, size.width - margin.right]);

        const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${size.height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

        // Generate x-axis label
        svg.append("g")
        .attr("transform", `translate(${margin.left + ((size.width - margin.left - margin.right) / 2)}, ${size.height - (margin.bottom / 5)})`)
        .append("text")
        .text("Year")
        .style("font-size", `${normalTextFontSize}px`);

        const yScale = d3.scaleLinear()
        .domain([5, d3.max(formattedData.map((dataPoint) => dataPoint.maxRating))])
        .range([size.height - margin.bottom, margin.top + plotTopPadding]);

        const yAxis = svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

        // Generte y-axis label
        svg.append("g")
        .attr("transform", `translate(${margin.left / 2}, ${margin.top + plotTopPadding + ((size.height - margin.top - plotTopPadding - margin.bottom) / 2)}) rotate(-90)`)
        .append("text")
        .text("Average IMDB Rating")
        .attr("text-anchor", "middle")
        .style("font-size", `${normalTextFontSize}px`);

        const lineGenerator = d3.line()
        .x((dataPoint) => xScale(dataPoint.year) + xScale.bandwidth() / 2)
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

        const yearPointsContainers = pointsContainer.selectAll("g")
        .data(formattedData)
        .enter()
        .append("g")
        .attr("id", (dataPoint) => `ratings-range-container-${dataPoint.year}`)
        .attr("class", "ratings-range-container");


        // Dotted line to show rating range
        yearPointsContainers.append("line")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("x1", (dataPoint) => xScale(dataPoint.year) + xScale.bandwidth() / 2)
        .attr("y1", (dataPoint) => yScale(dataPoint.minRating))
        .attr("x2", (dataPoint) => xScale(dataPoint.year) + xScale.bandwidth() / 2)
        .attr("y2", (dataPoint) => yScale(dataPoint.maxRating))
        .style("stroke-dasharray", ("3, 3"));

        // Min rating caps
        yearPointsContainers.append("line")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("x1", (dataPoint) => xScale(dataPoint.year) + (xScale.bandwidth() / 2) - (ratingCapWidth / 2))
        .attr("y1", (dataPoint) => yScale(dataPoint.minRating))
        .attr("x2", (dataPoint) => xScale(dataPoint.year) + (xScale.bandwidth() / 2) + (ratingCapWidth / 2))
        .attr("y2", (dataPoint) => yScale(dataPoint.minRating))

        // Max rating caps
        yearPointsContainers.append("line")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("x1", (dataPoint) => xScale(dataPoint.year) + (xScale.bandwidth() / 2) - (ratingCapWidth / 2))
        .attr("y1", (dataPoint) => yScale(dataPoint.maxRating))
        .attr("x2", (dataPoint) => xScale(dataPoint.year) + (xScale.bandwidth() / 2) + (ratingCapWidth / 2))
        .attr("y2", (dataPoint) => yScale(dataPoint.maxRating))

        yearPointsContainers.append("circle")
        .attr("class", "average-rating point")
        .attr("id", (dataPoint) => `average-rating-${dataPoint.year}`)
        .attr("cx", (dataPoint) => xScale(dataPoint.year) + xScale.bandwidth() / 2)
        .attr("cy", (dataPoint) => yScale(dataPoint.averageRating))
        .attr("r", pointRadius)
        .attr("stroke", "black")
        .attr("stroke-width", pointStrokeWidth)
        .style("fill", pointFill)
        .on("mouseover", function(event, dataPoint) {
            d3.select(this)
            .style("cursor", "pointer");

            highlightPoints(dataPoint.year);


            // Show ratings tooltip
            d3.select("#average-ratings-tooltip")
            .html(`Max: ${dataPoint.maxRating.toFixed(2)}
            <br/>
            Average: ${dataPoint.averageRating.toFixed(2)}
            <br/>
            Min: ${dataPoint.minRating.toFixed(2)}`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1)
            .style("visibility", "visible");
        })
        .on("mousemove", function(event, dataPoint) {
            d3.select("#average-ratings-tooltip")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
        })
        .on("mouseout", function(event, dataPoint) {
            if (d3.select(this).attr("class") == "average-rating point") {
                resetHighlightedPoints(dataPoint.year);
            }
            d3.select("#average-ratings-tooltip")
            .style("opacity", 0)
            .style("visibility", "hidden");
        })
        .on("click", function(event, dataPoint) {
            const selectedPoints = d3.selectAll(".average-rating.point-selected");
            // If there is a point already selected
            if (selectedPoints.size() > 0) {
                const selectedYear: number = selectedPoints.data()[0].year;
                // If the already selected point is the point clicked
                if (selectedYear == dataPoint.year) {
                    // Unselect the point
                    setReviewsYear(null)
                }
                else {
                    setReviewsYear(dataPoint.year);
                }
            }
            // If there are no points already selected
            else {
                selectedReviewsYear = dataPoint.year;
                setReviewsYear(dataPoint.year);
            }
            
        })

        const data2018 = formattedData.find((dataPoint) => dataPoint.year == 2018);
        const data2019 = formattedData.find((dataPoint) => dataPoint.year == 2019);
        const data2021 = formattedData.find((dataPoint) => dataPoint.year == 2021);

        const x2018 = xScale(2018) + xScale.bandwidth() / 2;
        const x2020 = xScale(2020) + xScale.bandwidth() / 2;
    
        const y2018 = yScale(data2018.averageRating);
        const yMax2018 = yScale(data2018.maxRating);
        const y2019 = yScale(data2019.averageRating);
        const y2021 = yScale(data2021.averageRating);
        const yMiddle = y2019 + (y2021 - y2019) / 2;

        const annotationGroup = svg.append("g").attr("id", "ratings-chart-annotations");

        // Point to start of inconsistent quality
        annotationGroup.append("line")
        .attr("x1", x2018 - 60)
        .attr("y1", y2018 + 80)
        .attr("x2", x2018)
        .attr("y2", y2018 + 5)
        .attr("stroke", "#999")
        .attr("stroke-width", 1);

        // Label start of inconsistent quality
        annotationGroup.append("text")
        .attr("x", x2018 - 65)
        .attr("y", y2018 + 85)
        .style("text-anchor", "middle")
        .style("font-size", "8px")
        .append("tspan")
        .attr("x", x2018 - 65)
        .attr("dy", "0")
        .text("Start of")
        .append("tspan")
        .attr("x", x2018 - 65)
        .attr("dy", "1.2em")
        .text("inconsistency");

        // Label Marvel's release of 2 biggest movies
        annotationGroup.append("text")
        .attr("x", x2018 + 8)
        .attr("y", yMax2018 - 15)
        .attr("text-anchor", "middle")
        .style("font-size", "8px")
        .append("tspan")
        .attr("x", x2018 + 8)
        .attr("dy", "0")
        .text("Released 2")
        .append("tspan")
        .attr("x", x2018 + 8)
        .attr("dy", "1.2em")
        .text("biggest movies");
        
        // Point to start of Marvel's fall
        annotationGroup.append("line")
        .attr("x1", x2020)
        .attr("y1", yMiddle)
        .attr("x2", x2020)
        .attr("y2", yMiddle + 70)
        .attr("stroke", "#999")
        .attr("stroke-width", 1);

        // Label start of Marvel's fall
        annotationGroup.append("text")
        .attr("x", x2020)
        .attr("y", yMiddle + 80)
        .attr("text-anchor", "middle")
        .style("font-size", "8px")
        .append("tspan")
        .attr("x", x2020)
        .attr("dy", 0)
        .text("Beginning")
        .append("tspan")
        .attr("x", x2020)
        .attr("dy", "1.2em")
        .text("of fall");


        // Generate title
        const title = svg.append('g')
        .append("text")
        .attr("transform", `translate(${margin.left + ((size.width - margin.left) / 2)}, ${margin.top - titleGraphPadding + 10})`)
        .style("text-anchor", "middle")
        .style("font-size", '15px')
        .style("font-weight", 900)
        .text("Average MCU Movie IMDB Rating Over Time"); 

        const hint = svg.append("text")
        .attr("x", margin.left + 20)
        .attr("y", margin.top + 170)
        .style("text-anchor", "start")
        .style("font-size", "10px")
        .style("font-weight", 500)
        .style("fill", "rgba(0,0,0,0.55)");

        hint.append("tspan").attr("x", margin.left + 20).attr("dy", 0).text("Hover over the dot for max, min,")
        hint.append("tspan").attr("x", margin.left + 20).attr("dy", "1.15em").text("and average ratings.")
        hint.append("tspan").attr("x", margin.left + 20).attr("dy", "1.15em").text("Click the dot to view reviews")
    }

    return (
        <>
            <div ref = {lineRef} id = "average-ratings-container" style = {{width: "100%", height: "100%"}}>
                <svg id = "average-ratings-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}
