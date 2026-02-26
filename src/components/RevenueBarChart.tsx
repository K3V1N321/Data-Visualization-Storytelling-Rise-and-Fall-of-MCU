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
}

type RevenueSplit = {
    year: number
    marvelRevenue: number
    otherMoviesRevenue: number
}
export default function RevenueBarChart() {
    const barRef = useRef<HTMLDivElement> (null);
    const margin: Margin = { top: 36, right: 70, bottom: 20, left: 100 }
    const [size, setSize] = useState<ComponentSize>({width: 0, height: 0});
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
    const [movies, setMovies] = useState<Movie[]>([]);

    useResizeObserver({ ref: barRef as React.RefObject<HTMLDivElement>, onResize });

    useEffect(() => {
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
                    revenue: Number(dataPoint.revenue)
                }
                moviesData.push(movieData);
            }
            setMovies(moviesData)            
        }

        loadData()
    }, [])

    useEffect(() => {
        console.log(size)
        if (isEmpty(movies)) {
            return;
        }
        if (size.width == 0 || size.height == 0) {
            return;
        }
        
        d3.select("#revenue-comparison-svg").selectAll("*").remove();

        generateBarChart();
    }, [movies, size])

    function generateBarChart() {
        console.log(size)
        const svg = d3.select("#revenue-comparison-svg");
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
        const maxRevenue = d3.max(formattedData, (dataPoint) => dataPoint.marvelRevenue + dataPoint.otherMoviesRevenue)
        
        const xScale = d3.scaleBand()
        .domain(formattedData.map((dataPoint) => dataPoint.year))
        .range([margin.left, size.width - margin.right]);

        const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${size.height - margin.bottom})`)
        .call(d3.axisBottom(xScale))

        const yScale = d3.scaleLinear()
        .domain([0, maxRevenue])
        .range([size.height - margin.bottom, margin.top])

        const yAxis = svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale))

        const barsGroup = svg.append("g").attr("id", "revenue-bars")
        
        barsGroup
        .selectAll("rect.marvel")
        .data(formattedData)
        .enter()
        .append("rect")
        .attr("class", (dataPoint) => `${dataPoint.year}-bar`)
        .attr("x", (dataPoint) => xScale(dataPoint.year))
        .attr("y", (dataPoint) => yScale(dataPoint.marvelRevenue))
        .attr("width", xScale.bandwidth())
        .attr("height", (dataPoint) => yScale(0) - yScale(dataPoint.marvelRevenue))
        .style("fill", "#8c564b")

        barsGroup
        .selectAll("rect.other")
        .data(formattedData)
        .enter()
        .append("rect")
        .attr("class", (dataPoint) => `${dataPoint.year}-bar`)
        .attr("x", (dataPoint) => xScale(dataPoint.year))
        .attr("y", (dataPoint) => yScale(dataPoint.marvelRevenue + dataPoint.otherMoviesRevenue))
        .attr("width", xScale.bandwidth())
        .attr("height", (dataPoint) => yScale(dataPoint.marvelRevenue) - yScale(dataPoint.marvelRevenue + dataPoint.otherMoviesRevenue))
        .style("fill", "teal")

    }


    return (
        <>
            <div ref = {barRef} style = {{width: "100%", height: "100%"}}>
                <svg id = "revenue-comparison-svg" width = "100%" height = "100%"></svg>
            </div>
        </>
    )
}