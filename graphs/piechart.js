function pieChart(divname) {
    const width = 450, height = 450, margin = 40

    const tooltip = d3.select("#tooltip")

	const radius = Math.min(width, height) / 2 - margin

    const svg = d3.select("#pieChart")
        .append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
		.attr("viewBox", "0 0 900 550")
		.attr("width", "100%")
		.attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${1.3*width}, ${height/2})`)

    const slider = svg.append("g")
		.attr("class", "slider")
		.attr("transform", `translate(${-1.3*width}, ${height/2})`)

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${-1.3*width+margin}, -150)`)

    let x, handle, label

    const colorScale = d3.scaleOrdinal()
        .range(['#bcbddc', '#9e9ac8', '#807dba', '#6a51a3'])
    
    const legend_labels = {
        "PRIV": "Private institutions",
        "PUBL": "Public institutions",
        "PRIV_IND": "Private government independent institutions",
        "PRIV_DEP": "Private government dependant institutions"
        }

    const rowConverter = d => {
        return {
            Worktime: d.worktime,
            Sector: d.sector,
            Sex: d.sex,
            ISCED: d.isced11,
            Year: parseInt(d.TIME_PERIOD),
            Amount: parseInt(d.OBS_VALUE),
            Country: d.name
        }
    }

    d3.csv("../data/countries.csv", rowConverter).then(function(data) {
        data = data.filter(d => {
            return d.Worktime === 'TOT_FTE' &&
                d.Sector !== 'TOT_SEC' &&
                d.Sex === 'T' &&
                d.ISCED === 'ED5-8' &&
                d.Country !== 'Albania' &&
                d.Country !== 'Bosnia and Herzegovina' &&
                d.Country !== 'Luxembourg'
        })

        const countries = Array.from(new Set(data.map(d => d.Country))).sort()
        let selectedCountry = countries[0]
        
        d3.select("#countrySelect2")
            .selectAll('options')
            .data(countries)
            .enter()
            .append('option')
            .text(d => d)
            .attr("value", d => d)

        let filteredData = data.filter(d => d.Country === selectedCountry)
        let years = Array.from(new Set(filteredData.map(d => d.Year))).sort()

        updateChart(filteredData, years[0])

		d3.select("#countrySelect2").on("change", function() {
			selectedCountry = d3.select(this).property("value")
            filteredData = data.filter(d => d.Country === selectedCountry)
            years = Array.from(new Set(filteredData.map(d => d.Year))).sort()

            updateChart(filteredData, years[0])
		})

        function set_slider(years) {

            x = d3.scaleLinear()
                .domain([years[0], years[years.length - 1]])
                .range([margin, 900 - margin])
                .clamp(true)

            handle = slider.insert("circle", ".track-overlay")
                .attr("class", "handle")
                .attr("r", 9)
                .attr("cx", x(years[0]))

            label = slider.append("text")  
                .attr("class", "label")
                .attr("text-anchor", "middle")
                .text(years[0])
                .attr("transform", "translate(0," + (-25) + ")")

            slider.append("line")
                .attr("class", "track")
                .attr("x1", x.range()[0])
                .attr("x2", x.range()[1])
                .attr("stroke", "#000")
                .attr("stroke-width", "10")
                .attr("stroke-linecap", "round")
                .select(function() { return this.parentNode.appendChild(this.cloneNode(true)) })
                .attr("class", "track-inset")
                .select(function() { return this.parentNode.appendChild(this.cloneNode(true)) })
                .attr("class", "track-overlay")
                .call(d3.drag()
                    .on("start.interrupt", function() { slider.interrupt() })
                    .on("start drag", function(event) { 
                        
                        var year = Math.round(x.invert(event.x))
                        handle.attr("cx", x(year))
                        label.attr("x", x(year)).text(year)
                        svg.selectAll('path').remove()
                        updateChart(filteredData, year)
                                
                    }))

            slider.insert("g", ".track-overlay")
                .attr("class", "ticks")
                .attr("transform", "translate(0, 18)")
                .selectAll("text")
                .data(years)
                .enter()
                .append("text")
                .attr("x", x)
                .attr("y", 10)
                .attr("text-anchor", "middle")
                .text(function(d) { return d; })

        }

		function updateChart(data, selectedYear) {
            svg.selectAll('path').remove()
            svg.selectAll('text').remove()
            svg.selectAll('circle').remove()
            svg.selectAll('rect').remove()

            set_slider(years)

            handle.attr("cx", x(selectedYear))
            label.attr("x", x(selectedYear))
                .text(selectedYear)

            let data_filtered = data.filter(d => d.Year === selectedYear)

			let processedData = d3.group(data_filtered, d => d.Sector)

            if (processedData.has("PRIV_IND") ||
                processedData.has("PRIV_DEP")) {
                data_filtered = data_filtered.filter(d => d.Sector !== "PRIV")
                processedData = d3.group(data_filtered, d => d.Sector)
            }

            const stackData = Array.from(processedData, ([key, value]) => ({
				Sector: key,
				Students: value[0].Amount
			}))

            const pie = d3.pie()
                .value(d => d[1].Students)
            const data_ready = pie(Object.entries(stackData))

            const arcGenerator = d3.arc()
                .innerRadius(0)
                .outerRadius(radius)

            let paths = svg.selectAll('path')
                .data(data_ready)

            paths.join("path")
				.merge(paths)
                .transition()
                .duration(1000)
                .attr('d', arcGenerator)
                .attr('fill', d => colorScale(d.data))
                .attr("stroke", "black")
                .style("stroke-width", "2px")
                .style("opacity", 0.7)
            
            paths.join('text')
                .merge(paths)
                .text(d => {
                    return ((d.endAngle-d.startAngle) / (2*Math.PI) * 100).toFixed(1) + "%"})
                .attr("transform", d => "translate(" + arcGenerator.centroid(d) + ")")
                .style("text-anchor", "middle")
                .style("font-size", 17)

            svg.selectAll('path')
                .data(data_ready)
                .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9)
                const students = (d.data[1].Students/1000).toFixed(0)
                const sector = legend_labels[d.data[1].Sector]
                const content = `${students}k students`
                tooltip.html(selectedCountry + "<br/>" + sector + "<br/>" + content)
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 28) + "px")
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill", "orange")
                })
                .on("mousemove", function (event, d) {
                    tooltip.style("left", (event.pageX) + "px")
                       .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                tooltip.transition()
                        .duration(500)
                        .style("opacity", 0)
                d3.select(this)
                    .transition()
                    .duration(250)
                    .attr("fill", d => colorScale(d.data))
                })

			legend.selectAll("rect")
				.data(data_ready)
				.enter().append("rect")
				.attr("x", 0)
				.attr("y", (d, i) => i * 20)
				.attr("width", 18)
				.attr("height", 18)
				.style("fill", d => colorScale(d.data))

			legend.selectAll("text")
				.data(data_ready)
				.enter().append("text")
				.attr("x", 24)
				.attr("y", (d, i) => i * 20 + 9)
				.attr("dy", ".35em")
				.text(d => legend_labels[d.data[1].Sector])
		}

		window.addEventListener("resize", function() {
			const newWidth = document.getElementById('pieChart').clientWidth
			
			svg.attr("width", newWidth)
		});
	}).catch(function(error) {
		console.error("Error loading data:", error)
	})
}

pieChart("pieChart")