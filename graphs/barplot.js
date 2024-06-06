function barplot(divname) {
    const margin = {top: 10, right: 20, bottom: 50, left: 90},
		w = 900 - margin.left - margin.right,
		h = 500 - margin.top - margin.bottom

	const tooltip = d3.select("#tooltip")

	const svg = d3.select("#barPlot")
		.append("svg")
		.attr("preserveAspectRatio", "xMidYMid meet")
		.attr("viewBox", "0 0 900 550")
		.attr("width", "100%")
		.attr("height", "100%")
		.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`)

	const xAxisGroup = svg.append("g")
		.attr("class", "x-axis")
		.attr("transform", `translate(0,${h})`)

	const yAxisGroup = svg.append("g")
		.attr("class", "y-axis")

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

	d3.csv("data/countries.csv", rowConverter).then(function(data) {
		data = data.filter(d => {
			return d.Worktime === 'TOT_FTE' &&
				d.Sector === 'TOT_SEC' &&
				d.ISCED === 'ED5-8' &&
				d.Country !== 'Europe'
		})

		const colorScale = d3.scaleOrdinal()
			.domain(['M', 'F'])
			.range(['#9ecae1', '#9e9ac8'])

		const legendData = ['Male students', 'Female students']

		const legend = svg.append("g")
			.attr("class", "legend")
			.attr("transform", "translate(600, 20)")

		legend.selectAll("rect")
			.data(legendData)
			.enter().append("rect")
			.attr("x", 0)
			.attr("y", (d, i) => i * 20)
			.attr("width", 18)
			.attr("height", 18)
			.style("fill", colorScale)
			.style("stroke", '#000')
			.style("stroke-opacity", 0.3)

		legend.selectAll("text")
			.data(legendData)
			.enter().append("text")
			.attr("x", 24)
			.attr("y", (d, i) => i * 20 + 9)
			.attr("dy", ".35em")
			.text(d => d)

		const years = Array.from(new Set(data.map(d => d.Year))).sort()
		const select = d3.select("#yearSelect")
		select.selectAll("option")
			.data(years)
			.enter()
			.append("option")
			.text(d => d)
			.attr("value", d => d)

		select.node().value = "2021"
		updateChart(data, 2021);

		d3.select("#yearSelect").on("change", function() {
			let selectedYear = +d3.select(this).property("value")
			updateChart(data, selectedYear)
		})

		function updateChart(data, selectedYear) {
			const filteredData = data.filter(d => d.Year === selectedYear)

			const processedData = d3.group(filteredData, d => d.Country)

			const stackData = Array.from(processedData, ([key, value]) => ({
				Country: key,
				M: value.find(d => d.Sex === 'M').Amount,
				F: value.find(d => d.Sex === 'F').Amount
			})).slice(0, 20)

			const xScale = d3.scaleLinear()
				.domain([0, d3.max(stackData, d => +d.M + +d.F)])
				.range([0, w])

			const yScale = d3.scaleBand()
				.domain(stackData.map(d => d.Country))
				.range([h, 0])
				.padding(0.1)		

			const xAxis = d3.axisBottom(xScale)
			const yAxis = d3.axisLeft(yScale)

			xAxisGroup.call(xAxis)
			yAxisGroup.call(yAxis)

			const stack = d3.stack()
				.keys(['M', 'F'])

			const series = stack(stackData)

			const bars = svg.selectAll(".bar-group")
				.data(series)

			bars.enter().append("g")
				.attr("class", "bar-group")
				.attr("fill", d => colorScale(d.key))
				.style("stroke", '#000')
				.style("stroke-opacity", 0.3)
				.selectAll("rect")
				.data(d => d)
				.enter().append("rect")
				.attr("x", d => xScale(d[0]))
				.attr("y", d => yScale(d.data.Country))
				.attr("width", d => xScale(d[1]) - xScale(d[0]))
				.attr("height", yScale.bandwidth())
				.on("mouseover", function(event, d) {
					d3.select(this).attr("fill", "orange")
					var students = ((d[1] - d[0])/1000).toFixed(0)
					var sex = d[0] === 0 ? 'male' : 'female'
					tooltip.transition()
						.duration(200)
						.style("opacity", .9)
					tooltip.html(`${d.data.Country}: ${students}k ${sex} students`)
						.style("left", `${event.pageX}px`)
						.style("top", `${event.pageY - 28}px`)
					})
				.on("mousemove", function (event, d) {
						tooltip.style("left", (event.pageX) + "px")
						   .style("top", (event.pageY - 28) + "px");
					})
				.on("mouseout", function(event, d) {
					tooltip.transition()
						.duration(500)
						.style("opacity", 0)
					var sex = d[0] === 0 ? 'M' : 'F'
					d3.select(this)
						.transition()
						.duration(250)
						.attr("fill", d => colorScale(sex))
				})

			bars.selectAll("rect")
                .data(d => d)
                .transition()
                .duration(1000)
                .attr("x", d => xScale(d[0]))
                .attr("y", d => yScale(d.data.Country))
                .attr("width", d => xScale(d[1]) - xScale(d[0]))
                .attr("height", yScale.bandwidth())

			bars.exit().remove()
			legend.exit().remove()
		}

		window.addEventListener("resize", function() {
			const newWidth = document.getElementById('barPlot').clientWidth
			
			svg.attr("width", newWidth)
		})
	}).catch(function(error) {
		console.error("Error loading data:", error)
	})
}

barplot("barPlot")