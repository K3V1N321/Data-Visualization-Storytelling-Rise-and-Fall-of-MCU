function connectionsNarration() {
    return (
        <>
            <p style = {{fontSize: "15px"}}>
                One of the main attractions of MCU movies is the idea that the stories
                of all the different movies occur in the same cinematic universe, allowing
                for movies from different series to be connected to each other.
                The timeline above displays connections between
                all MCU movies that have been released. The timeline shows
                three types of connections:
            </p>
            <ul style = {{fontSize: "15px", marginTop: 12}}>
                <li>Direct sequels: The next movie in a series that continues the story of the previous movie </li>
                <li>Crossover: A movie whose main characters are the main characters of different movie series</li>
                <li>Carryover: A movie whose story is directly incfluenced by or continues the story of a previous movie from a different series</li>
            </ul>
            <p style = {{fontSize: "15px", marginTop: 12}}>
                For analyzing the rise and success of MCU movies, we are mainly focusing on movies from Phase 1 to Phase 3.
                The timeline clearly shows that there are many connections between movies in Phase 1 to Phase 3, highlighting
                how tightly linked the movies are. The typical type of connection, seen in all types of movies, is a direct sequel.
                The main attraction of a movie sequel is that it continues the story of the previous movie(s) in the series, which
                is usually effective in bringing back audience members who enjoyed the previous movie(s). Throughout Phase 1 to Phase 3, Marvel created
                multiple movie series for popular superheroes, like the Iron Man, Captain America, and Thor movies. By creating sequels for these movie series,
                Marvel was able to continuously release movies that focused on popular superheros. Releasing movies that starred popular superheros was an effective
                technique to attract fans to watch movies, since regardless of the story or other aspects of the movie, the superhero being focused on is already
                a main attraction for many fans.
            </p>
            <p style = {{fontSize: "15px", marginTop: 12}}>
                The movie connections that make MCU movies really stand out from other movies are the crossover and carryover movies. With most movies, their
                stories are usually told in one movie or throughout a movie series, which is typically about three movies. The MCU movies stand out, because
                Marvel wanted all their movies to contribute to an overarching story. Rather than telling a story throughout three movies, Marvel told one large
                story throughout Phase 1 to Phase 3, which consisted of 21 movies. Telling a story throughout all of these movies helped create anticipation among fans
                for every new movie, since each movie was developing the overarching story and building up to the climax. The crossover movies, which is the series
                of Avengers movies and Captain America: Civil War, were highlights of the MCU movies. This is because these movies not only starred multiple popular superheroes,
                but they were also the ones that focused the most on the overarching story.

            </p>

        </>
    )
}

function boxOfficeNarration() {
    return (
        <>
            <p>
                The stacked bar chart above displays, for each year from 2008 to 2019, the total revenue of the top 10 highest-grossing movies worldwide
                and the portion of that revenue contributed by MCU movies. The main takeaway from this bar chart is that in most of these years MCU
                movies not only made it to the top 10 but also contributed a decent amount to the total revenue in each of those years. Furthermore, supporting the idea
                that the MCU was rising during this period and peaked in 2019, the revenue contribution from MCU movies generally increased throughout the years and peaked
                in 2019.
            </p>
            <p>
                The significance of this bar chart, in terms explaining the success of MCU movies, is that it shows that MCU movies appealed to fans worldwide, meaning
                Marvel's marketing strategy and movie format were successful in both the United States and gloablly. 
                This global appeal is depcited by the fact that the bar chart uses worldwide revenue and MCU movies had such high revenues in the chart.
                By appealing to fans worldwide, MCU movies were able to have a significant cultural impact, becoming a staple group of movies and helping to make comic book
                movies more mainstream. 
            </p>
        </>
    )
}

export default function McuRiseNarration({section}) {
    if (section == "connections") {
        return connectionsNarration();
    }
    else if (section == "box office") {
        return boxOfficeNarration();
    }
}