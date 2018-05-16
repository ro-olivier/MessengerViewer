(function(d3) {
  'use strict';

  var chart_width = 360;
  var chart_height = 360;
  var radius = Math.min(chart_width, chart_height) / 2.25;
  var donutWidth = 75;
  var legendRectSize = 18;
  var legendSpacing = 4;

  var slider_width = 300;
  var slider_height = 55;

  var legend_width = 300;
  var legend_height = 360;

  var color = d3.scaleOrdinal(d3.schemeCategory20b);

  var svg_message = d3.select('#message_chart')
    .append('svg')
    .attr('width', chart_width)
    .attr('height', chart_height)
    .append('g')
    .attr('transform', 'translate(' + (chart_width / 2) +
      ',' + (chart_height / 2) + ')');

  var svg_char = d3.select('#char_chart')
    .append('svg')
    .attr('width', chart_width)
    .attr('height', chart_height)
    .append('g')
    .attr('transform', 'translate(' + (chart_width / 2) +
      ',' + (chart_height / 2) + ')');

  var arc = d3.arc()
    .innerRadius(radius - donutWidth)
    .outerRadius(radius);

  var pie = d3.pie()
    .value(function(d) { return d.message_count; })
    .sort(null);

  var pie_char = d3.pie()
    .value(function(d) { return d.char_count; })
    .sort(null);   

  var tooltip_message = d3.select('#message_chart')
    .append('div')
    .attr('class', 'tooltip');

  var tooltip_char = d3.select('#char_chart')
    .append('div')
    .attr('class', 'tooltip');

  var user_input = d3.select('#user_input');

  tooltip_message.append('div')
    .attr('class', 'name');

  tooltip_message.append('div')
    .attr('class', 'message_count');

  tooltip_message.append('div')
    .attr('class', 'percent');

  tooltip_char.append('div')
    .attr('class', 'name');

  tooltip_char.append('div')
    .attr('class', 'char_count');

  tooltip_char.append('div')
    .attr('class', 'percent');

  var legends; 

  function timeConverter(UNIX_timestamp){
    
    var a = new Date(UNIX_timestamp * 1000);

    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();

    var time = date + ' ' + month + ' ' + year;
    return time;
  }

  d3.json('data_per_user_per_week.json', function(error, complete_dataset) { 

    var dataset = complete_dataset[0].data;
    var currentTotalEnabled = dataset.length;

    dataset.forEach(function(d) {
        d.message_count = +d.message_count;
        d.char_count = +d.char_count;
        d.enabled = true;                                         
    });

    var x = d3.scaleLinear()
        .domain([0, complete_dataset.length - 1])
        .range([0, slider_width * 0.8])
        .clamp(true);

    // We'll use this slider : https://bl.ocks.org/mbostock/6452972
    var slider = user_input.append('svg')
        .attr('width', slider_width)
        .attr('height', slider_height)
        .attr("id", "slider_block")
        .append("g")
        .attr("transform", "translate(30,30)");

    var dates_display = user_input.append('div')
        .attr("id", "dates_block")
        .append("g")
        .attr("transform", "translate(30," + parseInt(parseInt(30) + parseInt(slider_height)) + ")");

    var legend = user_input.append('svg')
        .attr('width', legend_width)
        .attr('height', legend_height)
        .attr("id", "legend_block");

    slider.append("line")
        .attr("class", "track")
        .attr("x1", x.range()[0])
        .attr("x2", x.range()[1])
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-inset")
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-overlay");

    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + -18 + ")")
      .selectAll("text")
      .data(x.ticks(10))
      .enter().append("text")
        .attr("x", x)
        .attr("text-anchor", "middle")
        .text(function(d) { return d; });

    var handle_max = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr("id", "handle_max")
        .attr("r", 9);

    var handle_min = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr("id", "handle_min")
        .attr("r", 9)
        .attr("cx", 0);

    var min_date_text = d3.select('#dates_block')
      .append("p")
      .append("text");

    var max_date_text = d3.select('#dates_block')
      .append("p")
      .append("text");

    d3.select(".track-overlay")
            .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt(); })
            .on("start drag", function() { 
              //console.log(d3.event.x);

              var cx_min = d3.select("#handle_min").attr("cx");
              var cx_max = d3.select("#handle_max").attr("cx");

              if (parseInt(cx_min) < 0) {
                hue("min", x.invert(0));
              }

              //console.log("cx_min = " + cx_min + " and cx_max = " + cx_max);
              
              if ((parseInt(d3.event.x) > parseInt(parseInt(-10) + parseInt(cx_max))) && (parseInt(d3.event.x) < parseInt(parseInt(10) + parseInt(cx_max)))) {
                if (parseInt(d3.event.x) < parseInt(parseInt(10) + parseInt(cx_min))) {
                  push_min_back();
                  //console.log("Max got too close to min, pushing min");
                } else {
                hue("max", x.invert(d3.event.x));
                console.log("Moving max handle");
                }
              }

              cx_min = d3.select("#handle_min").attr("cx");
              cx_max = d3.select("#handle_max").attr("cx");
              //console.log("cx_min = " + cx_min + " and cx_max = " + cx_max);

              if ((parseInt(d3.event.x) > parseInt(parseInt(-10) + parseInt(cx_min))) && (parseInt(d3.event.x) < parseInt(parseInt(10) + parseInt(cx_min)))) {
                if (parseInt(d3.event.x) > parseInt(parseInt(-10) + parseInt(cx_max))) {
                  push_max_forward();
                  //console.log("Min got too close to max, pushing max");
                } else {
                hue("min", x.invert(d3.event.x));
                console.log("Moving min handle");
                }
              }

              //console.log("Value for min = " + parseInt(x.invert(cx_min)));
              //console.log("Value for max = " + parseInt(x.invert(cx_max)));
            }));

    slider.transition() // Gratuitous intro!
        .duration(750)
        .tween("hue", function() {
          var i = d3.interpolate(0, x.range()[1]);
          return function(t) { hue("max", i(t)); };
        });

    function push_min_back() {
      
      var current_cx = handle_min.attr("cx");
      handle_min.attr("cx", current_cx - 10);
    }

    function push_max_forward() {
      
      var current_cx = handle_max.attr("cx");
      handle_max.attr("cx", parseInt(10) + parseInt(current_cx));
    }

    function hue(s, h) {
      
      if (s == "max") {
        handle_max.attr("cx", x(h));
        d3.select('#user_input').style("background-color", d3.hsl(h, 0.8, 0.8));
      } else if (s == "min") {
        handle_min.attr("cx", x(h));
        d3.select('#user_input').style("background-color", d3.hsl(h, 0.5, 0.5));
      }

      var cx_min = d3.select("#handle_min").attr("cx");
      var cx_max = d3.select("#handle_max").attr("cx");

      update_date_text(cx_min, cx_max);
      update_datasets(cx_min, cx_max);
    }

    function update_date_text(min_, max_) {

      var min_index = parseInt(x.invert(min_));
      var max_index = parseInt(x.invert(max_));

      min_date_text.text("Start date: " + timeConverter(complete_dataset[min_index].timestamp));
      max_date_text.text("End date: " + timeConverter(complete_dataset[max_index].timestamp));
    }

    function refresh_pie_charts() {                               

      path = path.data(pie(dataset));            

      path.transition()                                       
        .duration(750)                                        
        .attrTween('d', compute_tween);  

      path_char = path_char.data(pie_char(dataset));  

      path_char.transition()                                       
        .duration(750)                                        
        .attrTween('d', compute_tween);
    }

    function update_datasets(min_, max_) {

      //console.log("attempting to update values");

      var min_index = parseInt(x.invert(min_));
      var max_index = parseInt(x.invert(max_));

      var previous_dataset = dataset;
      dataset = complete_dataset[min_index].data;

      dataset.forEach(function(d) {
        var index = previous_dataset.findIndex(x => x.name == d.name);
        //console.log("index pour " + d.name + ": " + index);
        d.message_count = +d.message_count;
        d.char_count = +d.char_count;
        d.enabled = previous_dataset[index].enabled;
      });

      //console.log(dataset);

      refresh_pie_charts();
    }

    function show_tooltip(d) {

      var total_message = d3.sum(dataset.map(function(d) {
        return (d.enabled) ? d.message_count : 0;                       
      }));

      var total_char = d3.sum(dataset.map(function(d) {
        return (d.enabled) ? d.char_count : 0;                       
      }));

      var percent = Math.round(1000 * d.data.message_count / total_message) / 10;
      tooltip_message.select('.name').html(d.data.name);
      tooltip_message.select('.message_count').html(d.data.message_count);
      tooltip_message.select('.percent').html(percent + '%');
      tooltip_message.style('display', 'block');

      var percent_char = Math.round(1000 * d.data.char_count / total_char) / 10;
      tooltip_char.select('.name').html(d.data.name);
      tooltip_char.select('.char_count').html(d.data.char_count);
      tooltip_char.select('.percent').html(percent_char + '%');
      tooltip_char.style('display', 'block');  
    }

    function hide_tooltip() {
        tooltip_message.style('display', 'none');
        tooltip_char.style('display', 'none');
    }

    function compute_tween(d) {                         
      var interpolate = d3.interpolate(this._current, d); 
      this._current = interpolate(0);                     
      return function(t) {                                
        return arc(interpolate(t));                       
      };                                                  
    }

    var path = svg_message.selectAll('path')
      .data(pie(dataset))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', function(d, i) {
        return color(d.data.name);
      })                                                        
      .each(function(d) { this._current = d; });                

    path.on('mouseover', show_tooltip);
    path.on('mouseout', hide_tooltip);

    var path_char = svg_char.selectAll('path')
      .data(pie_char(dataset))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', function(d, i) {
        return color(d.data.name);
      })                                                        
      .each(function(d) { this._current = d; });                

    path_char.on('mouseover', show_tooltip);
    path_char.on('mouseout', hide_tooltip);

    legends = legend.selectAll('.legend')
      .data(color.domain())
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) {
        var height = legendRectSize + legendSpacing;
        var vert = i * height;
        return 'translate(60,' + vert + ')';
      });

    var activateAll = legend.append('g')
      .attr('class', 'legend')
        .attr('transform', function(d, i) {
          var height = legendRectSize + legendSpacing;
          var vert = (dataset.length - 1) * height * 1.2;
          return 'translate(60,' + vert + ')';
        });

    function toggle_participant(name) {

      var rect = d3.select(this);                             
      var enabled = true;                                     
      var totalEnabled = d3.sum(dataset.map(function(d) {     
        return (d.enabled) ? 1 : 0;                           
      }));    
                                     

      if (rect.attr('class') === 'disabled') {                
        rect.attr('class', '');
        currentTotalEnabled++;                               
      } else {                                                
        if (totalEnabled > 2) {                         
          rect.attr('class', 'disabled');
          d3.select('#activateAllRect').attr('class', 'disabled');                     
          enabled = false;
          currentTotalEnabled--;
        }                                    
      }   

      if (currentTotalEnabled == dataset.length) {
        d3.select('#activateAllRect').attr('class', ''); 
      }                                                 

      pie.value(function(d) {                                 
        if (d.name === name) d.enabled = enabled;           
        return (d.enabled) ? d.message_count : 0;                     
      });

      pie_char.value(function(d) {                                 
        if (d.name === name) d.enabled = enabled;           
        return (d.enabled) ? d.char_count : 0;                     
      });                                    

      refresh_pie_charts();                                                  
    }

    function toggle_all(name) {                            

      console.log(d3.select(this).attr('class'));
      if (d3.select(this).attr('class') === 'disabled') {
          var rects = d3.selectAll('rect');
          rects.attr('class', '');                          
      } else {
          console.log('Here deactivate!');                                          
          d3.select(this).attr('class', 'disabled');
      }

      currentTotalEnabled = dataset.length;

      pie.value(function(d) {
        d.enabled = true;                                 
        return d.message_count;                     
      });

      pie_char.value(function(d) {
        d.enabled = true;                                       
        return d.char_count;                     
      });                                    

      refresh_pie_charts();
    }  

    legends.append('rect')
      .attr('width', legendRectSize)
      .attr('height', legendRectSize)
      .style('fill', color)
      .style('stroke', color)                                
      .on('click', toggle_participant);                                                       

    legends.append('text')
      .attr('x', legendRectSize + legendSpacing)
      .attr('y', legendRectSize - legendSpacing)
      .text(function(d) { return d; });

    activateAll.append('rect')
      .attr('width', legendRectSize)
      .attr('height', legendRectSize)
      .style('fill', color)
      .style('stroke', color)
      .attr('id', 'activateAllRect')                                   
      .on('click', toggle_all);    

    activateAll.append('text')
      .attr('x', legendRectSize + legendSpacing)
      .attr('y', legendRectSize - legendSpacing)
      .text("Activate all");
  });

})(window.d3);