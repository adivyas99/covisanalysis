let data;
let stateData;

const margin = {top: 30, right: 80, bottom: 120, left: 130},
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

let svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

let stateDateData;  // Declare stateDateData in outer scope.

d3.csv("data.csv").then(loadedData => {
    loadedData.forEach(d => {
        d.cases = +d.cases;
        d.deaths = +d.deaths;
    });
    data = loadedData;

    stateDateData = d3.rollup(loadedData, 
        v => ({cases: d3.sum(v, d => d.cases), deaths: d3.sum(v, d => d.deaths)}),
        d => d.state,
        d => d.date // note the date is the second level of aggregation
    );

    drawScene1();
});

function clearSvg() {
    svg.selectAll("*").remove();
}

function drawScene1() {
    clearSvg();

    const selectedState = d3.select("#state-selector").node().value;
    let filteredData;

    if (selectedState !== "All") {
        let dataForSelectedState = stateDateData.get(selectedState);
        filteredData = Array.from(dataForSelectedState, ([date, value]) => ({date: date, ...value}));
    } else {
        let dataForAllStates = new Map();

        for (let stateData of stateDateData.values()) {
            for (let [date, {cases, deaths}] of stateData.entries()) {
                if (!dataForAllStates.has(date)) {
                    dataForAllStates.set(date, {cases: 0, deaths: 0});
                }

                dataForAllStates.get(date).cases += cases;
                dataForAllStates.get(date).deaths += deaths;
            }
        }

        filteredData = Array.from(dataForAllStates, ([date, value]) => ({date: date, ...value}));
    }

    filteredData.sort((a, b) => d3.ascending(new Date(a.date), new Date(b.date)));

    const x = d3.scaleTime().range([0, width]);
    const yCases = d3.scaleLinear()
    .range([height, 0])
    .domain([d3.min(filteredData, d => d.cases), d3.max(filteredData, d => d.cases)]);

    const yDeaths = d3.scaleLinear()
    .range([height, 0])
    .domain([d3.min(filteredData, d => d.deaths), d3.max(filteredData, d => d.deaths)]);



    const lineCases = d3.line()
    .x(d => x(new Date(d.date)))
    .y(d => yCases(d.cases));

    const lineDeaths = d3.line()
    .x(d => x(new Date(d.date)))
    .y(d => yDeaths(d.deaths));

    x.domain(d3.extent(filteredData, d => new Date(d.date)));
    // yCases.domain([0, d3.max(filteredData, d => d.cases)]);
    // yDeaths.domain([0, d3.max(filteredData, d => d.deaths)]); // set the domain of the death scale

    svg.append("path")
        .data([filteredData])
        .attr("class", "line")
        .attr("stroke", "steelblue")
        .attr("d", lineCases);

    svg.append("path")
        .data([filteredData])
        .attr("class", "line")
        .attr("stroke", "darkred")
        .attr("d", lineDeaths);

    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(yCases));
    
    svg.append("g")
        .attr("transform", "translate(" + width + " ,0)") 
        .call(d3.axisRight(yDeaths));
    
        svg.append("path")
        .data([filteredData])
        .attr("class", "line")
        .attr("stroke", "steelblue")
        .attr("d", lineCases)
        .on("mouseover", () => tooltip.style("opacity", .9))
        .on("mouseout", () => tooltip.style("opacity", 0))
        .on("mousemove", function(event) {
            const x0 = x.invert(d3.pointer(event, this)[0]),
                i = bisectDate(filteredData, x0, 1),
                d0 = filteredData[i - 1],
                d1 = filteredData[i],
                d = x0 - new Date(d0.date) > new Date(d1.date) - x0 ? d1 : d0;
            tooltip.html(`Date: ${d.date} <br> Cases: ${d.cases} <br> Deaths: ${d.deaths}`)
                .style("left", `${d3.pointer(event)[0] + margin.left+220}px`)
                .style("top", `${d3.pointer(event)[1] + margin.top+100}px`);
        });

    // Cases y-axis title
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Number of Cases"); 

    // Deaths y-axis title
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", width + (margin.right+45)/2)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Number of Deaths"); 

    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 100}, 10)`);

    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', 'steelblue');

    legend.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .text('Cases')
        .attr('alignment-baseline', 'middle');

    legend.append('rect')
        .attr('x', 0)
        .attr('y', 20)
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', 'darkred');

    legend.append('text')
        .attr('x', 20)
        .attr('y', 30)
        .text('Deaths')
        .attr('alignment-baseline', 'middle');

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const bisectDate = d3.bisector(d => new Date(d.date)).left;
}



function drawScene2() {
    console.log("drawScene2 is called");
    clearSvg();

    // Aggregate data by state
    const localStateData = Array.from(d3.rollup(data, 
        v => ({cases: d3.sum(v, d => d.cases), deaths: d3.sum(v, d => d.deaths)}),
        d => d.state),
    ([key, value]) => ({key, value}));

    console.log("Local state data:", localStateData);  // Debug statement

    // Define scales
    const x = d3.scaleBand()
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .range([height, 0]);

    // Set the scale domains
    x.domain(localStateData.map(d => d.key));
    y.domain([0, d3.max(localStateData, d => d.value.cases)]);

    console.log("X domain:", x.domain());  // Debug statement
    console.log("Y max value:", d3.max(localStateData, d => d.value.cases));  // Debug statement

    // Append the rectangles for the bar chart
    svg.selectAll(".bar")
        .data(localStateData)
        .enter().append("rect")
        .attr("class", "bar") // This assigns the class "bar" to each rectangle.
        .attr("x", d => x(d.key))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.value.cases))
        .attr("height", d => height - y(d.value.cases))
        .style("fill", "darkred");

    // Add the x-axis
    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")  
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)");

    // Add the y-axis
    svg.append("g")
        .call(d3.axisLeft(y));
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Number of Cases"); 


}

d3.select("#state-selector").on("change", function() {
    drawScene1();
});

function drawScene3() {
    clearSvg();

    // Aggregate data by county and state (to handle counties with the same name in different states)
    let countyData = Array.from(d3.rollup(data,
        v => ({cases: d3.sum(v, d => d.cases), deaths: d3.sum(v, d => d.deaths)}),
        d => `${d.county}, ${d.state}`),
        ([key, value]) => ({key, value})
    );

    // Sort data by number of cases and take top 10
    countyData.sort((a, b) => d3.descending(a.value.cases, b.value.cases));
    countyData = countyData.slice(0, 10);

    // Define scales
    const x = d3.scaleLinear()
        .range([0, width]);

    const y = d3.scaleBand()
        .range([0, height])
        .padding(0.1);

    // Set the scale domains
    x.domain([0, d3.max(countyData, d => d.value.cases)]);
    y.domain(countyData.map(d => d.key));

    // Append the rectangles for the bar chart
    svg.selectAll(".bar")
        .data(countyData)
        .enter().append("rect")
        .attr("class", "bar") // This assigns the class "bar" to each rectangle.
        .attr("x", 0)
        .attr("width", d => x(d.value.cases))
        .attr("y", d => y(d.key))
        .attr("height", y.bandwidth())
        .style("fill", "darkred");

    // Add the x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")  
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");
        // .attr("transform", "rotate(-65)");

    // Add the y-axis
    svg.append("g")
        .call(d3.axisLeft(y));
    
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Top 10 Counties with Max Cases"); 

    svg.append("text")
    .attr("transform", "rotate(0)")
    .attr("y", 0 - margin.left)
    .attr("x",0 - (height / 2))
    .attr("dx", "1em")
    .style("text-anchor", "middle")
    .text("Number of Cases"); 


}

// Attach click event listeners to the buttons
d3.selectAll('.btn-scene').on('click', function() {
    // Get the scene number from the data-scene attribute
    const sceneNumber = d3.select(this).attr('data-scene');
    if (sceneNumber === '1') {
        d3.select('#state-selection').style('display', 'block');
    } else {
        d3.select('#state-selection').style('display', 'none');
    }
    // Clear the SVG
    clearSvg();

    if (sceneNumber === '1') {
        drawScene1();
    } else if (sceneNumber === '2') {
        drawScene2();
    } else if (sceneNumber === '3') {
        drawScene3();
    }
});

