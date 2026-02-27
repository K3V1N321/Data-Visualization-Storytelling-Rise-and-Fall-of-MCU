import {useEffect, useRef, useState} from "react";
import * as d3 from "d3"
import { useResizeObserver, useDebounceCallback } from "usehooks-ts";
import { ComponentSize, Margin } from "../types";
import { isEmpty } from "lodash";


type Movie = {
    id: string
    title: string
    releaseYear: number
    isMarvel: string
    budget: number
    revenue: number
};

type RevenueSplit = {
    year: number
    marvelRevenue: number
    otherMoviesRevenue: number
};

export default function RevenueBarChart() {
    const barRef = useRef<HTMLDivElement> (null);
    const margin: Margin = { top: 36, right: 100, bottom: 40, left: 40 }
    const [size, setSize] = useState<ComponentSize>({width: 0, height: 0});
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const [movies, setMovies] = useState<Movie[]>([]);
    const titleGraphPadding = 90;
    const legendGraphPadding = 20;
    const normalTextFontSize = 13;
    const coloring = [{"type": "Marvel", "color": "#F0131E"}, {"type": "Other", "color": "teal"}]

    useResizeObserver({ ref: barRef as React.RefObject<HTMLDivElement>, onResize });

    useEffect(() => {
        // Read dataset for top 10 grossing movies
        const loadData = async() => {
            const data = await d3.csv("./data/top10_movies_2008_2025.csv")
            let moviesData: Movie[] = [];
            for (const dataPoint of data) {
                const movieData: Movie = {
                    id: dataPoint.id,
                    title: dataPoint.title,
                    releaseYear: Number(dataPoint.release_date.split("-")[0]),
                    isMarvel: dataPoint.is_marvel,
                    budget: Number(dataPoint.budget),
                    revenue: Number(dataPoint.revenue) / 1000000000
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
        
        d3.select("#revenue-comparison-svg").selectAll("*").remove();

        generateBarChart();
    }, [movies, size]);

    function generateBarChart() {
        const container = d3.select("#revenue-comparison-container");
        const svg = d3.select("#revenue-comparison-svg");

        // Tooltip for bars
        container.append("div")
        .attr('id', 'revenue-comparison-tooltip')
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

        // Get the revenue of marvel movies and other movies for each year
        let formattedData: RevenueSplit[] = [];
        const years = [... new Set(movies.map((movie) => movie.releaseYear))];
        for (const year of years) {
            const yearMovies = movies.filter((movie) => movie.releaseYear == year);
            const revenueInfo: RevenueSplit = {
                year: year,
                marvelRevenue: d3.sum(yearMovies.filter((movie) => movie.isMarvel == "true").map((movie) => movie.revenue)),
                otherMoviesRevenue: d3.sum(yearMovies.filter((movie) => movie.isMarvel == "false").map((movie) => movie.revenue))
            }
            formattedData.push(revenueInfo);

        }

        // Get max total revenue
        const maxRevenue = d3.max(formattedData, (dataPoint) => dataPoint.marvelRevenue + dataPoint.otherMoviesRevenue);
        
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
        .domain([0, maxRevenue])
        .range([size.height - margin.bottom, margin.top + titleGraphPadding]);

        const yAxis = svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

        // Generte y-axis label
        svg.append("g")
        .attr("transform", `translate(${margin.left / 2}, ${margin.top + titleGraphPadding + ((size.height - margin.top - titleGraphPadding - margin.bottom) / 2)}) rotate(-90)`)
        .append("text")
        .text("Revenue (Billion $)")
        .attr("text-anchor", "middle")
        .style("font-size", `${normalTextFontSize}px`);

        const barsGroup = svg.append("g")
        .attr("id", "revenue-bars");

        // Create a group for each year's bar
        const yearGroups = barsGroup.selectAll(".year-group")
        .data(formattedData)
        .enter()
        .append("g")
        .attr("class", (dataPoint) => `bar-${dataPoint.year}`)
        .on("mouseover", function(event, dataPoint) {
            const totalRevenue = dataPoint.marvelRevenue + dataPoint.otherMoviesRevenue;
            const marvelContribution = (dataPoint.marvelRevenue / totalRevenue) * 100;
            const otherContribution = (dataPoint.otherMoviesRevenue / totalRevenue) * 100;
            const otherRevenueHtml = `${dataPoint.otherMoviesRevenue.toFixed(2)} billion`;
            let marvelRevenueHtml = `${dataPoint.marvelRevenue.toFixed(2)} billion`;
            if (dataPoint.marvelRevenue == 0) {
                marvelRevenueHtml = "0";
            }
            // Display contribution of marvel movies and other movies
            d3.select("#revenue-comparison-tooltip")
            .html(`<strong>Marvel:</strong> \$${marvelRevenueHtml} (${marvelContribution.toFixed(2)}%) <br/> <strong>Other:</strong> \$${otherRevenueHtml} (${otherContribution.toFixed(2)}%)`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .style("opacity", 1)
            .style("visibility", "visible");
        })
        .on("mousemove", function(event, dataPoint) {
            d3.select("#revenue-comparison-tooltip")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
        })
        .on("mouseout", function(event, dataPoint) {
            // Hide tootip
            d3.select("#revenue-comparison-tooltip")
            .style("opacity", 0)
            .style("visibility", "hidden")
            const stackedBars = d3.select(this).selectAll("rect")
            stackedBars.style("stroke-width", "0px");
        });

        // Create stacked bars of revenues of marvel and other movies for each year
        yearGroups.selectAll("rect")
        .data((dataPoint) => {
            return [
                {
                    type: "Marvel",
                    value: dataPoint.marvelRevenue,
                    x: dataPoint.year,
                    y0: 0,
                    y1: dataPoint.marvelRevenue
                },
                {
                    type: "Other",
                    value: dataPoint.otherMoviesRevenue,
                    x: dataPoint.year,
                    y0: dataPoint.marvelRevenue,
                    y1: dataPoint.marvelRevenue + dataPoint.otherMoviesRevenue
                }
            ]
        })
        .enter()
        .append("rect")
        .attr("x", (dataPoint) => xScale(dataPoint.x))
        .attr("y", (dataPoint) => yScale(dataPoint.y1))
        .attr("width", xScale.bandwidth())
        .attr("height", (dataPoint) => yScale(dataPoint.y0) - yScale(dataPoint.y1))
        .attr("fill", (dataPoint) => {
            return coloring.filter((colorData) => colorData.type == dataPoint.type)[0].color
        });

        // Generate annotation for 2019 bar (gretaest marvel revenue contribution) 
        const data2019 = formattedData.filter((dataPoint) => dataPoint.year == 2019)[0];
        const x = xScale(data2019.year) + xScale.bandwidth();
        const barYTop = yScale(data2019.marvelRevenue + data2019.otherMoviesRevenue);
        const xDistanceFromBar = 30
        const yDistanceFromBar = 50
        const lineHeight = 1.2 * normalTextFontSize;
        const textBottomY = barYTop - yDistanceFromBar + lineHeight;


        const defs = svg.append("defs")
        // Define arrowhead
        defs.append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 5)
        .attr("refY", 5)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 Z")
        .attr("fill", "black");
        const annotationGroup = svg.append("g").attr("id", "max-contribution-annotation")

        // Generate annotation text
        annotationGroup.append("text")
        .attr("x", x + xDistanceFromBar)
        .attr("y", barYTop - yDistanceFromBar)
        .attr("text-anchor", "middle")
        .style("font-size", `${normalTextFontSize}px`)
        .append("tspan")
        .attr("x", x + xDistanceFromBar)
        .attr("dy", "0")
        .text("Max Marvel")
        .append("tspan")
        .attr("x", x + xDistanceFromBar)
        .attr("dy", "1.2em")
        .text("Contribution")

        // Generate line from annotation text to 2019 bar
        annotationGroup.append("line")
        .attr("x1", x + xDistanceFromBar)
        .attr("y1", textBottomY + 5)
        .attr("x2", x)
        .attr("y2", barYTop)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("marker-end", "url(#arrowhead)");


        // Generate legend
        const legendContainer = svg.append("g")
        .attr("id", "revenue-comparisonlegend")
        .attr("transform", `translate(${size.width - margin.right + legendGraphPadding}, ${margin.top + titleGraphPadding})`)

        // Generate legend title
        legendContainer.append("g")
        .append("text")
        .attr("transform", `translate(0, 15)`)
        .style("text-anchor", "right")
        .style("font-weight", "bold")
        .style("font-size", "13px")
        .text("Movie Type");

        const legendItems = legendContainer.selectAll(".legend-item")
        .data(coloring)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (dataPoint, i) => `translate(0, ${i * 25 + 20})`);

        legendItems.append("rect")
        .attr("width", 13)
        .attr("height", 13)
        .attr("fill", (dataPoint) => dataPoint.color);

        legendItems.append("text")
        .attr("x", 15)
        .attr("y", 11)
        .style("font-size", `${normalTextFontSize}px`)
        .text((dataPoint) => dataPoint.type)
        


        // Generate title
        const title = svg.append('g')
        .append("text")
        .attr("transform", `translate(${margin.left + ((size.width - margin.left) / 2)}, ${margin.top})`)
        .style("text-anchor", "middle")
        .style("font-size", '20px')
        .style("font-weight", 900)
        .text("Annual Top 10 Grossing Movies Revnue: Marvel's Contribution (2008 - 2025)") 
    }


    return (
        <>
            <div ref = {barRef} id = "revenue-comparison-container" style = {{width: "100%", height: "100%"}}>
                <svg id = "revenue-comparison-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}