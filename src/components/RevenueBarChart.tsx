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
    revenue: number
};

type RevenueSplit = {
    year: number
    marvelRevenue: number
    otherMoviesRevenue: number
};

export default function RevenueBarChart({timePeriod}) {
    const barRef = useRef<HTMLDivElement> (null);
    const margin: Margin = { top: 34, right: 92, bottom: 46, left: 88 }
    const [size, setSize] = useState<ComponentSize>({width: 0, height: 0});
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const [movies, setMovies] = useState<Movie[]>([]);
    const containerId = `${timePeriod}-revenue-comparison-container`;
    const svgId = `${timePeriod}-revenue-comparison-svg`;
    const container = d3.select(`#${containerId}`);
    const svg = d3.select(`#${svgId}`);

    // Tooltip for bars
    const tooltipElement = container.selectChild("#revenue-comparison-tooltip");
    if (tooltipElement.empty()) {
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
    }
    

    const titleGraphPadding = 84;
    const legendGraphPadding = 14;
    const normalTextFontSize = 13;
    const coloring = [{"type": "Marvel", "color": "#b21f3a"}, {"type": "Other", "color": "#8a97a3"}]

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
        
        svg.selectAll("*").remove();

        generateBarChart();
    }, [movies, size]);

    function generateBarChart() {
        // Get the revenue of marvel movies and other movies for each year
        let formattedData: RevenueSplit[] = [];
        let years = [... new Set(movies.map((movie) => movie.releaseYear))].sort((a, b) => a - b);

        if (timePeriod == "early") {
            years = years.filter((year) => year <= 2019);
        }
        // "recent" mode now shows the full range (2008 - 2025)
  
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
        .range([margin.left, size.width - margin.right])
        .paddingInner(0.22)
        .paddingOuter(0.08);

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

        // Horizontal grid lines for easier value reading
        svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(
            d3.axisLeft(yScale)
            .ticks(6)
            .tickSize(-(size.width - margin.left - margin.right))
            .tickFormat(() => "")
        )
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll("line")
            .attr("stroke", "rgba(0,0,0,0.10)")
            .attr("stroke-dasharray", "3,4"));

        const yAxis = svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).ticks(6).tickFormat((d) => `$${Number(d).toFixed(1)}B`));

        xAxis.call((g) => g.select(".domain").attr("stroke", "rgba(0,0,0,0.28)"));
        xAxis.call((g) => g.selectAll("line").attr("stroke", "rgba(0,0,0,0.25)"));
        xAxis.call((g) => g.selectAll("text").style("font-size", "11px").style("fill", "rgba(0,0,0,0.72)"));
        yAxis.call((g) => g.select(".domain").remove());
        yAxis.call((g) => g.selectAll("line").attr("stroke", "rgba(0,0,0,0.18)"));
        yAxis.call((g) => g.selectAll("text").style("font-size", "11px").style("fill", "rgba(0,0,0,0.72)"));

        // Generte y-axis label
        svg.append("g")
        .attr("transform", `translate(24, ${margin.top + titleGraphPadding + ((size.height - margin.top - titleGraphPadding - margin.bottom) / 2)}) rotate(-90)`)
        .append("text")
        .text("Revenue (Billion $)")
        .attr("text-anchor", "middle")
        .style("font-size", `${normalTextFontSize}px`);

        const barsGroup = svg.append("g")
        .attr("id", `${timePeriod}-revenue-bars`);

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

            d3.select(this)
            .selectAll("rect")
            .transition()
            .duration(220)
            .ease(d3.easeCubicInOut)
            .attr("stroke", "rgba(0,0,0,0.55)")
            .attr("stroke-width", "1.5px")
            .attr("opacity", 0.9);
            
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
            d3.select(this)
            .selectAll("rect")
            .transition()
            .duration(220)
            .ease(d3.easeCubicInOut)
            .attr("stroke-width", "0px")
            .attr("opacity", 1);
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
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", (dataPoint) => {
            return coloring.filter((colorData) => colorData.type == dataPoint.type)[0].color
        })
        .attr("stroke", "#FFFF00")
        .attr("stroke-width", "0px");

        if (timePeriod == "early" || timePeriod == "recent") {
            // Generate annotation for the year with the highest Marvel contribution ratio
            const bestContribution = formattedData
            .filter((dataPoint) => dataPoint.marvelRevenue + dataPoint.otherMoviesRevenue > 0)
            .reduce((best, dataPoint) => {
                const totalRevenue = dataPoint.marvelRevenue + dataPoint.otherMoviesRevenue;
                const ratio = dataPoint.marvelRevenue / totalRevenue;
                if (ratio > best.ratio) {
                    return { dataPoint, ratio };
                }
                return best;
            }, { dataPoint: formattedData[0], ratio: -1 });

            if (bestContribution.ratio >= 0) {
            const targetData = bestContribution.dataPoint;
            const x = xScale(targetData.year);
            const barYTop = yScale(targetData.marvelRevenue + targetData.otherMoviesRevenue);
            const xDistanceFromBar = -34
            const yDistanceFromBar = 50
            const lineHeight = 1.2 * normalTextFontSize;
            const textBottomY = barYTop - yDistanceFromBar + lineHeight;


            const defs = svg.append("defs")
            // Define arrowhead
            defs.append("marker")
            .attr("id", `${timePeriod}-arrowhead`)
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
            .text("Peak Marvel")
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
            .attr("marker-end", `url(#${timePeriod}-arrowhead)`);
            }
        }
        


        // Generate legend
        const legendContainer = svg.append("g")
        .attr("id", `${timePeriod}-revenue-comparison-legend`)
        .attr("transform", `translate(${margin.left - 30}, ${margin.top + legendGraphPadding})`)

        // Generate legend title
        legendContainer.append("g")
        .append("text")
        .attr("transform", `translate(0, 12)`)
        .style("text-anchor", "right")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .style("fill", "rgba(0,0,0,0.72)")
        .text("Movie Type");

        const legendItems = legendContainer.selectAll(".legend-item")
        .data(coloring)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (dataPoint, i) => `translate(0, ${i * 22 + 18})`);

        legendItems.append("rect")
        .attr("width", 11)
        .attr("height", 11)
        .attr("rx", 2)
        .attr("fill", (dataPoint) => dataPoint.color);

        legendItems.append("text")
        .attr("x", 16)
        .attr("y", 9.5)
        .style("font-size", "12px")
        .style("fill", "rgba(0,0,0,0.75)")
        .text((dataPoint) => dataPoint.type)
        

        let titleText = "Annual Top-10 Box Office Revenue: Marvel vs Others";
        if (timePeriod == "early") {
            titleText = titleText.concat(" (2008 - 2019)");
        }
        else if (timePeriod == "recent"){
            titleText = titleText.concat(" (2008 - 2025)");
        }
        // Generate title
        const title = svg.append('g')
        .append("text")
        .attr("transform", `translate(${margin.left + ((size.width - margin.left) / 2)}, ${margin.top})`)
        .style("text-anchor", "middle")
        .style("font-size", '15px')
        .style("font-weight", 900)
        .text(titleText) 
    }


    return (
        <>
            <div ref = {barRef} id = {containerId} style = {{width: "100%", height: "100%"}}>
                <svg id = {svgId} width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}
