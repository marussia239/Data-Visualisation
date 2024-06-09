function timeline(divname) {
    const margin = {top: 10, right: 30, bottom: 30, left: 60},
        width = 900 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom

    const tooltip = d3.select("#tooltip")

    const svg = d3.select("#timeline")
        .append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
		.attr("viewBox", "0 0 900 550")
		.attr("width", "100%")
		.attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

    const rowConverter = d => {
        return {
            Worktime: d.worktime,
            Sector: d.sector,
            Sex: d.sex,
            ISCED: d.isced11,
            Year: d3.timeParse("%Y")(d.TIME_PERIOD),
            Amount: parseInt(d.OBS_VALUE),
            Country: d.name
        }
    }
    
    d3.csv("data/countries.csv", rowConverter).then(function(data) {
        data = data.filter(d => {
			return d.Worktime === 'TOT_FTE' &&
					d.Sector === 'TOT_SEC' &&
					d.Sex === 'T' &&
					d.ISCED === 'ED5-8' &&
                    d.Country !== 'Albania' &&
                    d.Country !== 'Bosnia and Herzegovina' &&
                    d.Country !== 'Luxembourg' &&
                    d.Country !== 'Montenegro' &&
                    d.Country !== 'Netherlands' &&
                    d.Country !== 'United Kingdom'
		}).sort((a, b) => a.Year - b.Year)

        const countries = Array.from(new Set(data.map(d => d.Country))).sort()

        d3.select("#countrySelect")
            .selectAll('options')
            .data(countries)
            .enter()
            .append('option')
            .text(d => d)
            .attr("value", d => d)

        let selectedCountry = countries[0]
        let curr_data = data.filter(d => d.Country === selectedCountry)

        const x = d3.scaleTime()
            .domain([d3.timeParse("%Y")(2012), d3.timeParse("%Y")(2022)])
            .range([ 0, width ])
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x).ticks(9))
    
        y_margin = (d3.max(curr_data, d => d.Amount) - d3.min(curr_data, d => d.Amount)) / 4

        const y = d3.scaleLinear()
            .domain([d3.min(curr_data, d => d.Amount) - y_margin, 
                d3.max(curr_data, d => d.Amount) + y_margin])
            .range([ height, 0 ])
        svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y))

        const line = svg.append("path")
            .datum(curr_data)
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.Amount))
            )
            .attr("stroke", "black")
            .style("stroke-width", 4)
            .style("fill", "none")
    
        const dot = svg.selectAll('circle')
            .data(curr_data)
            .join('circle')
            .attr("cx", d => x(d.Year))
            .attr("cy", d => y(d.Amount))
            .attr("r", 7)
            .style("fill", '#9ecae1')
            .attr("stroke", "black")
            .on("mouseover", function(event, d) {
				tooltip.transition()
					.duration(200)
					.style("opacity", .9)
				tooltip.html(selectedCountry + ": " + d3.timeFormat('%Y')(d.Year) + " year<br/>" + (d.Amount/1000).toFixed(0) + "k students")
					.style("left", (event.pageX) + "px")
					.style("top", (event.pageY - 28) + "px")
				d3.select(this)
                    .transition()
                    .duration(250)
                    .style("fill", "orange")
				})
            .on("mousemove", function (event, d) {
                    tooltip.style("left", (event.pageX) + "px")
                       .style("top", (event.pageY - 28) + "px");
                })
            .on("mouseout", function(d) {
                tooltip.transition()
                        .duration(500)
                        .style("opacity", 0)
                d3.select(this)
                    .transition()
                    .duration(250)
                    .style("fill", '#9ecae1')
            })
            
        d3.select("#countrySelect").on("change", function() {
			let selectedCountry = d3.select(this).property("value")
			updateTimeline(data, selectedCountry)
		})

        function updateTimeline(data, selectedCountry) {
            curr_data = data.filter(d => d.Country === selectedCountry)

            const y_margin = (d3.max(curr_data, d => d.Amount) - 
                        d3.min(curr_data, d => d.Amount)) / 4

            y.domain([d3.min(curr_data, d => d.Amount) - y_margin, 
                d3.max(curr_data, d => d.Amount) + y_margin])
            
            svg.select(".y-axis")
                .transition().duration(1000)
                .call(d3.axisLeft(y))

            line.datum(curr_data)
                .transition()
                .duration(1000)
                .attr("d", d3.line()
                    .x(d => x(d.Year))
                    .y(d => y(d.Amount))
                )
                .attr("stroke", "black")
                .style("stroke-width", 4)
                .style("fill", "none")

            dot.data(curr_data)
                .transition()
                .duration(1000)
                .attr("cx", d => x(d.Year))
                .attr("cy", d => y(d.Amount))

            dot.on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9)
                    tooltip.html(selectedCountry + ": " + d3.timeFormat('%Y')(d.Year) + " year<br/>" + (d.Amount/1000).toFixed(0) + "k students")
                        .style("left", (event.pageX) + "px")
                        .style("top", (event.pageY - 28) + "px")
                    d3.select(this)
                        .transition()
                        .duration(250)
                        .style("fill", "orange")
                    })
                .on("mousemove", function (event, d) {
                        tooltip.style("left", (event.pageX) + "px")
                           .style("top", (event.pageY - 28) + "px");
                    })
                .on("mouseout", function(d) {
                    tooltip.transition()
                            .duration(500)
                            .style("opacity", 0)
                    d3.select(this)
                        .transition()
                        .duration(250)
                        .style("fill", '#9ecae1')
                })
        }

        window.addEventListener("resize", function() {
            const newWidth = document.getElementById("timeline").clientWidth
			
			svg.attr("width", newWidth)
        })

    }).catch(function(error) {
        console.error("Error loading data:", error)
    })
}

timeline("timeline")