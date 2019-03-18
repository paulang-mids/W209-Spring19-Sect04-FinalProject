//Width and height
  var w = 500;
  var h = 300;



  //Define map projection
  var projection = d3.geoAlbersUsa()
               .translate([w/2, h/2])
               .scale([500]);

  //Define path generator
  var path = d3.geoPath()
           .projection(projection);

  var color = d3.scaleSequential(d3.interpolateBlues)

  //Create SVG element
  var svg = d3.select("body")
        .append("svg")
        .attr("width", w)
        .attr("height", h);

  //Load in agriculture data
  // d3.csv("../data/us-ag-productivity.csv", function(data) {
  d3.json("../data/alldata.json", function(error, data) {
    if (error) throw error;

    // console.log(data);
    var countyAgg = d3.nest()
    .key(function(d) { return d.state + d.county; })
    .rollup(function(v) { return {
      count: v.length,
      population: d3.max(v, function(d){ return d.population}),
      totRisk: d3.mean(v, function(d) { return d.totrisk; }),
      risk1: d3.mean(v, function(d) { return d.risk1; })
    }; })
    .entries(data);
    // countyAggJson = JSON.stringify(countyAgg);
    // console.log(JSON.stringify(countyAgg));
    var stateAgg = d3.nest()
    .key(function(d) { return d.key.substring(0,2) ; })
    .rollup(function(v) { return {
      count: v.length,
      population: d3.sum(v, function(d){ return parseInt(d.value.population);}),
      totRisk: d3.mean(v, function(d) { return parseFloat(d.value.totRisk); }),
      risk1: d3.mean(v, function(d) { return parseFloat(d.value.risk1); })
    }; })
    .entries(countyAgg);
    // console.log(JSON.stringify(stateAgg));
    // for (var key in countyAggJson) {
    //   console.log(key, countyAggJson[key].population);
    // }
    //Set input domain for color scale
    color.domain([
      d3.min(stateAgg, function(d) { return d.value.totRisk; }),
      d3.max(stateAgg, function(d) { return d.value.totRisk; })
    ]);

    //Load in GeoJSON data
    d3.json("../data/us-states.json", function(json) {

      //Merge the ag. data and GeoJSON
      //Loop through once for each ag. data value
      // for (var i = 0; i < countyAgg.length; i++) {
      stateAgg.forEach(function(d) {
        //Grab state name
        var dataState = d.key;
        // console.log(dataState);
        //Grab data value, and convert from string to float
        var dataValue = parseFloat(d.value.totRisk);
        // console.log(dataValue);

        //Find the corresponding state inside the GeoJSON
        for (var j = 0; j < json.features.length; j++) {

          var jsonState = json.features[j].properties.name_abbr;

          if (dataState == jsonState) {

            //Copy the data value into the JSON
            json.features[j].properties.value = dataValue;

            //Stop looking through the JSON
            break;

          }
        }
      })

      //Bind data and create one path per GeoJSON feature
      svg.selectAll("path")
         .data(json.features)
         .enter()
         .append("path")
         .attr("d", path)
         .style("fill", function(d) {
            //Get data value
            // var value = d.properties.value/1000000;
            var value = d.properties.value;
            // console.log(d.properties.name_abbr, value)

            if (value) {
              //If value exists…
              return color(value);
            } else {
              //If value is undefined…
              return "#ccc";
            }
         });

    });

  });
