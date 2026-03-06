import {useEffect, useRef, useState} from "react";
import * as d3 from "d3"
import { useResizeObserver, useDebounceCallback } from "usehooks-ts";
import { ComponentSize, Margin } from "../types";
import { isEmpty } from "lodash";

type Movie = {
    id: string
    title: string
    releaseYear: number
    imdbRating: number
    profit: number
};


export default function RatingsProfitScatterPlot({timePeriod}) {
    const scatterRef = useRef<HTMLDivElement>(null)
    const margin: Margin = { top: 60, right: 40, bottom: 50, left: 60 }
    const [size, setSize] = useState<ComponentSize>({width: 0, height: 0});
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const [movies, setMovies] = useState<Movie[]>([]);
    const containerId = `${timePeriod}-ratings-profit-container`;
    const svgId = `${timePeriod}-ratings-profit-svg`;
    const container = d3.select(`#${containerId}`);
    const svg = d3.select(`#${svgId}`);

    // Tooltip for points
    const tooltipElement = container.selectChild(`#${timePeriod}-ratings-profit-tooltip`);
    if (tooltipElement.empty()) {
        container.append("div")
        .attr('id', `${timePeriod}-ratings-profit-tooltip`)
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
    const normalTextFontSize = 13;
    const pointRadius = 5;
    const pointStrokeWidth  = 1.5;
    const pointFill = "#FFCC00"

    useResizeObserver({ ref: scatterRef as React.RefObject<HTMLDivElement>, onResize });

    useEffect(() => {
        const loadData = async() => {
            const data = await d3.csv("./data/marvel_movies_tmdb.csv");
            let moviesData: Movie[] = [];
            for (const movie of data) {
                const movieData: Movie = {
                    id: movie.id,
                    title: movie.title,
                    releaseYear: Number(movie.release_date.split("-")[0]),
                    imdbRating: Number(movie.imdb_average_rating),
                    profit: (Number(movie.revenue) - Number(movie.budget)) / 1000000000
                };
                moviesData.push(movieData)
            }
            setMovies(moviesData)
        };
        loadData();
    }, []);

    useEffect(() => {
        if (isEmpty(movies)) {
            return;
        }
        if (size.width == 0 || size.height == 0) {
            return;
        }
        d3.select(`#${svgId}`).selectAll("*").remove();
        generateScatterPlot();
    }, [movies, size])

    function generateScatterPlot() {
        const maxRating: number = d3.max(movies.map((movie) => movie.imdbRating));
        let minProfit: number = d3.min(movies.map((movie) => movie.profit));
        if (minProfit > 0) {
            minProfit = 0;
        }
        const maxProfit: number = d3.max(movies.map((movie) => movie.profit));
        
        const filteredMovies = movies.filter((movie) => {
            if (timePeriod == "early") {
                return movie.releaseYear <= 2019;
            }
            else {
                return movie.releaseYear > 2019
            }
        });

        const xScale = d3.scaleLinear()
        .domain([0, maxRating])
        .range([margin.left, size.width - margin.right])

        const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${size.height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

        // Generate x-axis label
        svg.append("g")
        .attr("transform", `translate(${margin.left + ((size.width - margin.left - margin.right) / 2)}, ${size.height})`)
        .append("text")
        .text("Average IMDB Rating")
        .style("font-size", `${normalTextFontSize}px`);

        const yScale = d3.scaleLinear()
        .domain([minProfit, maxProfit])
        .range([size.height - margin.bottom, margin.top]);

        const yAxis = svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).ticks(6).tickFormat((dataPoint) => `$${Number(dataPoint).toFixed(1)}B`));

        // Generate y-axis label
        svg.append("g")
        .attr("transform", `translate(${margin.left / 2}, ${margin.top + ((size.height - margin.top - margin.bottom) / 2)}) rotate(-90)`)
        .append("text")
        .text("Profit (Billion $)")
        .attr("text-anchor", "middle")
        .style("font-size", `${normalTextFontSize}px`);

        const pointsContainer = svg.append("g")
        .attr("id", `${timePeriod}-scatter-points-container`);
        
        pointsContainer.selectAll("circle")
        .data(filteredMovies)
        .enter()
        .append("circle")
        .attr("cx", (movie) => xScale(movie.imdbRating))
        .attr("cy", (movie) => yScale(movie.profit))
        .attr("r", pointRadius)
        .attr("stroke", "black")
        .attr("stroke-width", pointStrokeWidth)
        .style("fill", pointFill)
        .on("mouseover", function(event, dataPoint) {
            d3.select(this)
            .transition()
            .duration(300)
            .ease(d3.easeCubicInOut)
            .attr("r", pointRadius + 3)
            .attr("stroke-width", pointStrokeWidth + 2);

            d3.select(`#${timePeriod}-ratings-profit-tooltip`)
            .html(`Rating: ${dataPoint.imdbRating} <br/> Profit: \$${dataPoint.profit.toFixed(2)} Billion`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1)
            .style("visibility", "visible");
        })
        .on("mousemove", function(event) {
            d3.select(`#${timePeriod}-ratings-profit-tooltip`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
        })
        .on("mouseout", function(event) {
            d3.select(this)
            .transition()
            .duration(300)
            .ease(d3.easeCubicInOut)
            .attr("r", pointRadius)
            .attr("stroke-width", pointStrokeWidth);

            d3.select(`#${timePeriod}-ratings-profit-tooltip`)
            .style("visibility", "hidden")
            .style("opacity", 0);
        })

        let plotTitle: string = "Profit vs Average IMDB Rating";
        if (timePeriod == "early") {
            plotTitle = plotTitle.concat(" (2008 - 2019)");
        }
        else {
            plotTitle = plotTitle.concat(" (2020 - 2026)");
        }
        // Generate title
        const title = svg.append('g')
        .append("text")
        .attr("transform", `translate(${margin.left + ((size.width - margin.left) / 2)}, ${margin.top - titleGraphPadding})`)
        .style("text-anchor", "middle")
        .style("font-size", '15px')
        .style("font-weight", 900)
        .text(plotTitle); 
    }

    return (
        <>
            <div ref = {scatterRef} id = {containerId} style = {{width: "100%", height: "100%"}}>
                <svg id = {svgId} width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}