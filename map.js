function map(divname) {
	const margin = {top: 10, right: 50, bottom: 10, left: 50},
		w = 900 - margin.left - margin.right,
		h = 500 - margin.top - margin.bottom

	const tooltip = d3.select("#tooltip")

    const albers = d3.geoAlbers()
        .rotate([-20.0, 0.0])
        .center([0.0, 52.0])
        .parallels([35.0, 65.0])
        .translate([w / 2, h / 2])
        .scale(600)
        .precision(.1)

	const path = d3.geoPath()
        .projection(albers)

	let x, handle, label

    const svg = d3.select("#map-container")
		.append("svg")
		.attr("preserveAspectRatio", "xMidYMid meet")
		.attr("viewBox", "0 0 900 550")
		.attr("width", "100%")
		.attr("height", "100%")
		.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`)

	const slider = svg.append("g")
		.attr("class", "slider")
		.attr("transform", `translate(0,${h})`)

	const colorScale = d3.scaleThreshold()
        .domain([10000, 100000, 1000000, 2000000, 3000000, 5000000, 7000000])
        .range(d3.schemeBlues[8])

	const rowConverter = function(d) {
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
		initializeMap(data)
		updateMap(data, 2013)
	}).catch(function(error) {
		console.error("Error loading data:", error)
	})
	
	function initializeMap(data) {
		const years = Array.from(new Set(data.map(d => d.Year))).sort()

		x = d3.scaleLinear()
			.domain([years[0], years[years.length - 1]])
			.range([0, w])
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
				.on("start.interrupt", function() { slider.interrupt(); })
				.on("start drag", function(event) { 
					
					var year = Math.round(x.invert(event.x))
					handle.attr("cx", x(year))
					label.attr("x", x(year)).text(year)
					updateMap(data, year)
							
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

		const legend = svg.append("g")
			.attr("transform", "translate(0, 10)")

		colorScale.domain().forEach(function(limit, i) {
			legend.append("rect")
				.attr("width", 20)
				.attr("height", 20)
				.attr("y", i * 25)
				.attr("fill", colorScale(limit))
				.style("stroke", '#000')
				.style("stroke-opacity", 0.3)

			legend.append("text")
				.attr("x", 30)
				.attr("y", i * 25 + 15)
				.text(">" + limit/1000 + "k students")
		})
		
	}

	function updateMap(data, selectedYear) {

		handle.attr("cx", x(selectedYear));
		label.attr("x", x(selectedYear))
			.text(selectedYear)

		const dataset = data.filter(function(d) {
			return d.Worktime === 'TOT_FTE' &&
					d.Sector === 'TOT_SEC' &&
					d.Sex === 'T' &&
					d.ISCED === 'ED5-8' &&
					d.Year === selectedYear
		})

		d3.json("../europe.geojson").then(function(json) {
			const studentByCountry = {}
			dataset.forEach(function(d) {
				studentByCountry[d.Country] = +d.Amount
			})

			json.features.forEach(function(d) {
				d.properties.students = studentByCountry[d.properties.NAME] || 0
			})
			
			const paths = svg.selectAll("path")
				.data(json.features)

			paths.enter()
				.append("path")
				.merge(paths)
				.attr("d", path)
				.attr("fill", function(d) {
					return colorScale(d.properties.students)
				})
				.style("stroke", '#000')
				.style("stroke-opacity", 0.3)
				.on("mouseover", function(event, d) {
				tooltip.transition()
					.duration(200)
					.style("opacity", .9)
				const students = (d.properties.students/1000).toFixed(0)
				const content = students > 0 ? `${students}k students` : "no data"
				tooltip.html(d.properties.NAME + ": " + content)
					.style("left", (event.pageX) + "px")
					.style("top", (event.pageY - 28) + "px")
				d3.select(this).attr("fill", "orange")
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
						.attr("fill", d => colorScale(d.properties.students))
				})

			paths.exit().remove()
		})
	}

	window.addEventListener("resize", function() {
		const newWidth = document.getElementById('map-container').clientWidth
		svg.attr("width", newWidth)
	})
}

map("map")