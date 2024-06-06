function sankey(divname) {
    const margin = {top: 10, right: 20, bottom: 50, left: 50},
		w = 900 - margin.left - margin.right,
		h = 500 - margin.top - margin.bottom

    const tooltip = d3.select("#tooltip")

    const svg = d3.select("#Sankey")
        .append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
		.attr("viewBox", "0 0 900 550")
		.attr("width", "100%")
		.attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

    const colorScale = d3.scaleOrdinal(d3.schemeSet3)

    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .size([w, h])

    d3.csv("../data/sankey.csv").then(function(data) {

        const graph = {
                "nodes": [],
                "links": []
            }
 
        data.forEach(d => {
            graph.nodes.push({ "name": d.source })
            graph.nodes.push({ "name": d.target })
            graph.links.push({ "source": d.source, "target": d.target, "value": +d.value })
        })

        graph.nodes = Array.from(new Set(graph.nodes.map(d => d.name)))
                            .map(name => { return { "name": name } })

        graph.links.forEach(d => {
            d.source = graph.nodes.findIndex(n => n.name === d.source)
            d.target = graph.nodes.findIndex(n => n.name === d.target)
        })

        const sankeyGraph = sankey(graph)

        const link = svg.append("g")
            .selectAll(".link")
            .data(sankeyGraph.links)
            .join("path")
            .attr("class", "link")
            .attr("d", d3.sankeyLinkHorizontal() )
            .style("stroke-width", d => Math.max(1, d.width))
            .style("fill", "none")
            .style("stroke", "#000")
            .style("stroke-opacity", 0.2)
            .sort(function(a, b) { return b.dy - a.dy })

        link.on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9)
            const students = (d.value * 100).toFixed(1)
            tooltip.html(d.source.name + " to " + d.target.name + '<br/>' + students + "% of students in Netherlands" )
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("stroke-opacity", 0.2)
            d3.select(this)
                .transition()
                .duration(200)
                .style("stroke-opacity", 0.4)
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
                .style("stroke-opacity", 0.2)
            })
        
        const node = svg.append("g")
            .selectAll(".node")
            .data(sankeyGraph.nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`)
            .call(d3.drag()
            .subject(d => d)
            .on("start", function() { this.parentNode.appendChild(this) })
            .on("drag", dragmove))
        
        const rect = node.append("rect")
            .attr("height", d => d.y1 - d.y0)
            .attr("width", sankey.nodeWidth())
            .style("fill", d => colorScale(d.name))
            .style("stroke", d => d3.rgb(colorScale(d.name)).darker(2))
            // Add hover text
            // .append("title")
            // .text(function(d) { return d.name + "\n" + "There is " + d.value + " stuff in this node" })
        
        node.append("text")
            .attr("x", -6)
            .attr("y", d => (d.y1 - d.y0) / 2)
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(d => d.name)
            .filter(d => d.x0 < w / 2)
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start")

        rect.on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9)
                const students = (d.value * 100).toFixed(1)
                tooltip.html(d.name + '<br/>' + students + "% of students in Netherlands" )
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 28) + "px")
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("fill", d => d3.rgb(colorScale(d.name)).darker(1))
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
                    .style("fill", d => colorScale(d.name))
                })
        
        function dragmove(event, d) {
            const y = Math.max(0, Math.min(h - (d.y1 - d.y0), d.y0 += event.dy))
            d3.select(this).attr("transform", `translate(${d.x0},${d.y0 = y})`)
            sankey.update(sankeyGraph)
            link.attr("d", d3.sankeyLinkHorizontal())
            }

		window.addEventListener("resize", function() {
			const newWidth = document.getElementById('pieChart').clientWidth
			
			svg.attr("width", newWidth)
		})
	}).catch(function(error) {
		console.error("Error loading data:", error)
	})
}

sankey("Sankey")