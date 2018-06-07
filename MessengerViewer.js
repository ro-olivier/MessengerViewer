'use strict';

/* Examples, tutorials and code examples used for this project.
For the main chart and the zoom/brush feature:
https://bl.ocks.org/mbostock/raw/34f08d5e11952a80609169b7917d4172/

For the stack area chart example:
https://bl.ocks.org/mbostock/raw/3885211/

For the transition between layer in stack area:
https://bl.ocks.org/mbostock/raw/4060954/

For the pie chart (donut style!) with transition:
https://bl.ocks.org/mbostock/raw/1346410/
http://zeroviscosity.com/d3-js-step-by-step/step-0-intro

For the toggle buttons:
http://nikhil-nathwani.com/blog/posts/radio/radio.html
*/

/* TODO
 - The user is able to set the end date before the start date, which results in NaN being taken as time range values.
*/

/* Defining SVG variables and parameters */

var svg = d3.select('svg'),
    margin = {top: 20, right: 20, bottom: 300, left: 60},
    margin2 = {top: 395, right: 20, bottom: 210, left: 60},
    margin3 = {top: 595, right: 20, bottom: 0, left: 60},
    width = +svg.attr('width') - margin.left - margin.right,
    height = +svg.attr('height') - margin.top - margin.bottom,
    height2 = +svg.attr('height') - margin2.top - margin2.bottom,
    height3 = +svg.attr('height') - margin3.top - margin3.bottom;

var radius = 80;
var donutWidth = 50;

var legendRectSize = 18;
var legendVerticalSpacing = 4;
var legendHorizontalSpacing = 150;
var legendMaxItemOnColumn = 6;

var legend_vertical_offset = +margin3.top - +radius ;

var donut_lateral_offset = +margin3.left + +(3 * width / 4)
var donut_vertical_offset = margin3.top - legendRectSize;
var tooltip_lateral_offset = 2*margin3.left + +(3 * width / 4) + radius;
var tooltip_vertical_offset = +margin3.top - radius / 2;

var tooltip_height = 100;
var tooltip_width = 100;
var tooltip_text_size = 12;

var tooltip_element_vertical_offset = +tooltip_vertical_offset + +(tooltip_height / 2);
var tooltip_vertical_spacing = 20;
var tooltip_element_vertical_offset_negative = +tooltip_element_vertical_offset - tooltip_vertical_spacing;
var tooltip_element_vertical_offset_positive = +tooltip_element_vertical_offset + +tooltip_vertical_spacing;

var data_type_toggle_width= 70;
var data_type_toggle_height= 25;
var data_type_toggle_padding= 10;

var defaultColor= '#7777BB'
var hoverColor= '#0000ff'
var pressedColor= '#000077'
var data_type_toggle_text_size = 12;
var data_type_toggle_lateral_offset = 1.5*margin3.left + +(width / 2) - radius;
var data_type_toggle_vertical_offset = legend_vertical_offset;
var data_type_toggle_text_vertical_offset = legend_vertical_offset + +(data_type_toggle_height / 2);
var data_type_toggle_left_text_lateral_offset = data_type_toggle_lateral_offset - data_type_toggle_width;
var data_type_toggle_right_text_lateral_offset = data_type_toggle_lateral_offset + +data_type_toggle_width;

var dates_display_lateral_offset = data_type_toggle_lateral_offset;
var dates_display_vertical_offset = data_type_toggle_vertical_offset + 3.5*legendRectSize;
var dates_display_vertical_spacing = tooltip_vertical_spacing*1.1;

var reset_date_lateral_offset = data_type_toggle_lateral_offset;
var reset_date_vertical_offset = dates_display_vertical_offset + 3*legendRectSize;
var reset_date_width = data_type_toggle_width*2 + data_type_toggle_padding;
var reset_date_color = '#843C39';

/* Defining variable used in the script logic */

var color = d3.scaleOrdinal(d3.schemeCategory20b); // we'll use D3Js standard colors for the viz
var keys; // will holds the keys of the data array, i.e. the names of the participants

var min_timestamp; // will hold the minimum timestamp found in the selection (zoom)
var max_timestamp; // will hold the maximum timestamp found in the selection (zoom)

var permanent_max_timestamp; // will hold the maximum date found in the dataset
var permanent_min_timestamp; // will hold the minimum date found in the dataset

var initial_min_index = 0; // will hold the index, in the data array, of the first week to be displayed
var initial_max_index;

var currentTotalEnabled; // will hold the current number of enabled participants (must be > 2)
var enabledParticipants = {}; // will hold a dict with the state (enabled or not) of each participant

var current_layer; // will hold the data displayed by the layers currently on screen
var new_layer; // when transitioning (on the main chart), will hold the new data

var stacked_data; // will hold the whole data for the stacked chart
var context_stacked_data = []; // will hold the data for the context chart (zoom chart). 
// Depending on the data_type variable this will either be a sum of message count or char count

var data_type; // will hold the type of data displayed, either messages or characters

var cumul_data_pie_chars; // will hold the data for the char pie
var cumul_data_pie_messages; // will hold the data for the message pie

var path; // will hold the data for each 'segment' of the pie chart currently on screen

// The axis used for the two area charts
var x = d3.scaleTime().range([0, width]),
    x2 = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    y2 = d3.scaleLinear().range([height2, 0]);

var xAxis = d3.axisBottom(x),
    xAxis2 = d3.axisBottom(x2),
    yAxis = d3.axisLeft(y);

/* Defining D3JS objects */

var brush = d3.brushX()
  .extent([[0, 0], [width, height2]])
  .on('brush end', brushed);

var zoom = d3.zoom()
  .scaleExtent([1, Infinity])
  .translateExtent([[0, 0], [width, height]])
  .extent([[0, 0], [width, height]])
  .on('zoom', zoomed);

var stack_message = d3.stack()
  .value(function(d, key) {
    return enabledParticipants[key] ? d[key].messages : 0;
  });

var stack_char = d3.stack()
  .value(function(d, key) {
    return enabledParticipants[key] ? d[key].chars : 0;
  });

var area = d3.area()
  .curve(d3.curveMonotoneX)
  .x(function(d, i) { return x(new Date(d.data.timestamp * 1000)); })
  .y0(function(d) { return y(d[0]); })
  .y1(function(d) { return y(d[1]); });

var area2 = d3.area()
  .curve(d3.curveMonotoneX)
  .x(function(d) { return x2(new Date(d.timestamp * 1000)); })
  .y0(height2)
  .y1(function(d, i) { 
    if (data_type === 'messages') {
      return y2(d.total_message); 
    } else {
      return y2(d.total_char);
    };
  });

var pie = d3.pie()
  .value(function(d) { return (d.enabled) ? d.count : 0; })
  .sortValues(function (a, b) {
    return a - b;
  });

var arc = d3.arc()
  .innerRadius(radius - donutWidth)
  .outerRadius(radius);

/* Appending all the necessary stuff to the SVG */

// The SVG itself
svg.append('defs').append('clipPath')
  .attr('id', 'clip')
  .append('rect')
  .attr('width', width)
  .attr('height', height);

// The main chart (stacked area)
var focus = svg.append('g')
  .attr('class', 'focus')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// The context chart, or zoom chart, below the main one
var context = svg.append('g')
  .attr('class', 'context')
  .attr('transform', 'translate(' + margin2.left + ',' + margin2.top + ')');

// The donut chart
var donut = svg.append('g')
  .attr('class', 'donut')
  .attr('transform', 'translate(' + donut_lateral_offset + ',' + donut_vertical_offset + ')');

// The legend on the left-hand side, to let the user enable or disable participants
var legend = svg.append('g')
  .attr('class', 'legend')
  .attr('transform', 'translate(' + margin3.left + ',' + legend_vertical_offset + ')');

var legends; // Will hold individual legend item, initiated once the file has been read

// The additional legend button to reactivate all participants at once
var activateAll_vertical_offset = +legend_vertical_offset + (legendMaxItemOnColumn+1)*(legendRectSize + legendVerticalSpacing);
var activateAll = svg.append('g')
  .attr('class', 'activateAll')
  .attr('transform', 'translate(' + margin3.left + ',' + activateAll_vertical_offset + ')');

activateAll.append('rect')
  .attr('width', legendRectSize)
  .attr('height', legendRectSize)
  .style('fill', '#843C39')
  .style('stroke', '#843C39')
  .attr('id', 'activateAllRect')
  .on('click', reactivate_all);

activateAll.append('text')
  .attr('x', legendRectSize + legendVerticalSpacing)
  .attr('y', legendRectSize - legendVerticalSpacing)
  .text('Activate all');

// The tooltip being displayed when hovering on a segment of the donut chart
var tooltip = svg.append('g')
  .attr('class', 'tooltip');

var tooltip_rect = tooltip.append('rect')
  .attr('height', tooltip_height)
  .attr('width', tooltip_width)
  .style('fill', 'white')
  .attr('transform', 'translate(' + tooltip_lateral_offset + ',' + tooltip_vertical_offset + ')');

var name = tooltip.append('text')
  .attr('class', 'name')
  .attr('fill', 'black')
  .attr('font-size', tooltip_text_size)
  .attr('transform', 'translate(' + tooltip_lateral_offset + ',' + tooltip_element_vertical_offset_negative + ')');

var count = tooltip.append('text')
  .attr('class', 'count')
  .attr('fill', 'black')
  .attr('font-size', tooltip_text_size)
  .attr('transform', 'translate(' + tooltip_lateral_offset + ',' + tooltip_element_vertical_offset + ')');

var percent = tooltip.append('text')
  .attr('class', 'percent')
  .attr('fill', 'black')
  .attr('font-size', tooltip_text_size)
  .attr('transform', 'translate(' + tooltip_lateral_offset + ',' + tooltip_element_vertical_offset_positive + ')');

// The buttons used to toggle between message and characters views
var toggle_buttons = svg.append('g')
  .attr('id', 'toggle_buttons')
  .attr('transform', 'translate(' + data_type_toggle_lateral_offset + ',' + data_type_toggle_vertical_offset + ')');

var toggle_button_data = [{text:'Messages', 'id':'messages'}, {text:'Characters', 'id': 'chars'}];

var toggle_button_groups = toggle_buttons.selectAll('g.button')
  .data(toggle_button_data)
  .enter()
  .append('g')
  .attr('class', 'button')
  .attr('id', function(d) { return d.id; })
  .style('cursor', 'pointer')
  .on('click', function(d, i) {
      update_button_colors(d3.select(this), d3.select(this.parentNode));
      if (data_type !== toggle_button_data[i].id) toggle_data_type();
  })
  .on('mouseover', function() {
      if (d3.select(this).select('rect').attr('fill') != pressedColor) {
          d3.select(this)
              .select('rect')
              .attr('fill', hoverColor);
      }
  })
  .on('mouseout', function() {
      if (d3.select(this).select('rect').attr('fill') != pressedColor) {
          d3.select(this)
              .select('rect')
              .attr('fill', defaultColor);
      }
  });

toggle_button_groups.append('rect')
  .attr('class', 'buttonRect')
  .attr('width', data_type_toggle_width)
  .attr('height', data_type_toggle_height)
  .attr('x', function(d, i) {
      return (data_type_toggle_width + data_type_toggle_padding) * i;
  })
  .attr('rx', 5) 
  .attr('ry', 5)
  .attr('fill', defaultColor);

toggle_button_groups.append('text')
  .attr('class', 'buttonText')
  .attr('font-size', '12px')
  .attr('x', function(d, i) {
      return (data_type_toggle_width + data_type_toggle_padding) * i + data_type_toggle_width / 2;
  })
  .attr('y', data_type_toggle_height/2)
  .attr('text-anchor', 'middle')
  .attr('dominant-baseline', 'central')
  .attr('fill', 'white')
  .text(function(d) {return d.text; });

// Here is the text displaying the dates of the current selection
var dates_display = svg.append('g')
  .attr('id', 'dates_display')
  .attr('transform', 'translate(' + dates_display_lateral_offset + ',' + dates_display_vertical_offset + ')');

var dates_display_data = [{'id':'date_start_display'}, {'id': 'date_end_display'}];

var dates_display_groups = dates_display.selectAll('text')
  .data(dates_display_data)
  .enter()
  .append('text')
  .attr('class', 'dates_display')
  .attr('id', function(d) { return d.id; })
  .attr('dy', function (d, i) { return i*dates_display_vertical_spacing; })
  .attr('font-size', '12px')
  .style('cursor', 'pointer')
  .on('click', get_date_from_user);

// Here is the "reset" date button
var reset_date_button = svg.append('g')
  .attr('id', 'reset_date_button')
  .attr('transform', 'translate(' + reset_date_lateral_offset + ',' + reset_date_vertical_offset + ')')
  .attr('class', 'button')
  .style('cursor', 'pointer')
  .on('click', reset_date);

reset_date_button.append('rect')
  .attr('class', 'buttonRect')
  .attr('width', reset_date_width)
  .attr('height', data_type_toggle_height)
  .attr('rx', 5) 
  .attr('ry', 5)
  .attr('fill', reset_date_color);

reset_date_button.append('text')
.attr('class', 'buttonText')
.attr('font-size', '12px')
.attr('x', reset_date_width/2)
.attr('y', data_type_toggle_height/2)
.attr('text-anchor', 'middle')
.attr('dominant-baseline', 'central')
.attr('fill', 'white')
.text('Reset dates selection');

// Here starts the real stuff...
d3.json('stacked.json', function(error, data) {
  if (error) throw error;

  // Init is done on messages
  data_type = 'messages';
  update_button_colors(toggle_buttons.select('#messages'), toggle_buttons);

  keys = Object.keys(data[0]);
  keys.splice(keys.indexOf('timestamp'), 1);
  keys.sort();

  color.domain(keys);
  stack_message.keys(keys);
  stack_char.keys(keys);

  // Init is done with all participants
  keys.forEach(function (d) {
    enabledParticipants[d] = true;
  });
  currentTotalEnabled = keys.length;

  // Init is done with all the data
  initial_max_index = data.length;
  stacked_data = data.slice(initial_min_index, initial_max_index);
  
  min_timestamp = d3.min(stacked_data.map(function(d) { return d.timestamp; }));
  max_timestamp = d3.max(stacked_data.map(function(d) { return d.timestamp; }));

  permanent_min_timestamp = min_timestamp;
  permanent_max_timestamp = max_timestamp;

  update_date_display(min_timestamp, max_timestamp);

  x.domain([new Date(min_timestamp * 1000), new Date(max_timestamp * 1000)]);
  x2.domain(x.domain());

  var cumul_data_messages = {};
  var cumul_data_chars = {};

  // This bit of logic adds up the data in each element of the array to get grand totals of messages and char counts
  // And also stores the sum for each person, for the donut chart
  stacked_data.forEach(function(d, i){
    d.total_message = 0;
    d.total_char = 0;

    if (Object.keys(cumul_data_messages).length == 0) {
      keys.forEach(function(k){
        d.total_message = +d[k].messages;
        d.total_char = +d[k].chars;
        cumul_data_messages[k] = +d[k].messages;
        cumul_data_chars[k] = +d[k].chars;
      });
    } else {
      keys.forEach(function(k){
        d.total_message += +d[k].messages;
        d.total_char += +d[k].chars;
        cumul_data_messages[k] += +d[k].messages;
        cumul_data_chars[k] += +d[k].chars;
      });
    }

    // Preparing the data for the context chart
    context_stacked_data[i] = {'timestamp': d.timestamp,
                                'total_message': d.total_message, 
                                'total_char': d.total_char };
  });

  // Additional processing on the pie chart data, to add the keys that will be used to 
  // figure out whether to display the data or not for a given participant
  var cumul_data_pie_messages_ = transform(cumul_data_messages, keys);
  cumul_data_pie_messages = apply_enabled_participant(cumul_data_pie_messages_);

  var cumul_data_pie_chars_ = transform(cumul_data_chars, keys);
  cumul_data_pie_chars = apply_enabled_participant(cumul_data_pie_chars_);

  // Setting the y domains of the graph with the data we read
  y.domain([0, d3.max(stacked_data, function(d) { return d.total_message; })]).nice();
  y2.domain(y.domain());

  current_layer = stack_message(stacked_data);

  // D3Js SVG stuff : we are displaying the data for the first time!
  focus.selectAll('.area')
    .data(current_layer)
    .enter()
    .append('path')
    .attr('d', area)
    .attr('class', 'area')
    .style('fill', function(d) { return color(d.key); });

  focus.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

  focus.append('g')
      .attr('class', 'axis axis--y')
      .call(yAxis);

  context.append('path')
      .datum(context_stacked_data)
      .attr('class', 'area')
      .attr('d', area2);

  context.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + height2 + ')')
      .call(xAxis2);

  context.append('g')
      .attr('class', 'brush')
      .call(brush)
      .call(brush.move, x.range());

  svg.append('rect')
      .attr('class', 'zoom')
      .attr('width', width)
      .attr('height', height)
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .call(zoom);

  path = donut.selectAll('path')
  .data(pie(cumul_data_pie_messages))
  .enter()
  .append('path')
  .attr('d', arc)
  .attr('fill', function(d) { return color(d.data.name)})
  .each(function(d) { this._current = d; });

  path.on('mouseover', show_pie_tooltip);
  path.on('mouseout', hide_pie_tooltip);

  legends = legend.selectAll('.legend')
      .data(color.domain())
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) {
        var vert = (i % legendMaxItemOnColumn) * (legendRectSize + legendVerticalSpacing);
        var hor = (parseInt(i / legendMaxItemOnColumn) * legendHorizontalSpacing);
        return 'translate(' + hor + ',' + vert + ')';
      });

  legends.append('rect')
    .attr('width', legendRectSize)
    .attr('height', legendRectSize)
    .style('fill', color)
    .style('stroke', color)
    .on('click', toggle_participant);

  legends.append('text')
    .attr('x', legendRectSize + legendVerticalSpacing)
    .attr('y', legendRectSize - legendVerticalSpacing)
    .text(function(d) { return d; });
});

function brushed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return;
  // ignore brush-by-zoom

  // Updating the time domain with the selected range
  var s = d3.event.selection || x2.range();

  do_brushed(s[0], s[1], s.map(x2.invert, x2));
}

function do_brushed(v0, v1, range) {
  x.domain(range);

  // Updating the main chart
  focus.select('.axis--x').call(xAxis);
  svg.select('.zoom').call(zoom.transform, d3.zoomIdentity
      .scale(width / (v1 - v0))
      .translate(-v0, 0));

  // Depending on the current data type, we compute the new data to display in the donut chat
  if (data_type === 'messages') {
    var cumul_data_messages = {};

    stacked_data.forEach(function(d, i){
      d.total_message = 0;

      // Additional condition (compared to similar code in init) to keep data only from selected range
      if ((d.timestamp * 1000) >= range[0].getTime() && 
        (d.timestamp * 1000) <= range[1].getTime()) {

      if (Object.keys(cumul_data_messages).length == 0) {
            keys.forEach(function(k){
              d.total_message += d[k].messages;
              cumul_data_messages[k] = d[k].messages;
            });
          } else {
          //d.timestamp = d['timestamp'];
            keys.forEach(function(k){
              d.total_message += d[k].messages;
              cumul_data_messages[k] += d[k].messages;
            });
        } 
      }
    });

    min_timestamp = d3.min(stacked_data.map(function(d) { if (d.total_message > 0) return d.timestamp; }));
    max_timestamp = d3.max(stacked_data.map(function(d) { if (d.total_message > 0) return d.timestamp; }));

    var cumul_data_pie_messages_ = transform(cumul_data_messages, keys);
    cumul_data_pie_messages = apply_enabled_participant(cumul_data_pie_messages_);

    path = donut.selectAll('path').data(pie(cumul_data_pie_messages));
  } else {
    var cumul_data_chars = {};

    stacked_data.forEach(function(d, i){
      d.total_char = 0;

      // Additional condition (compared to similar code in init) to keep data only from selected range
      if ((d.timestamp * 1000) >= range[0].getTime() && 
        (d.timestamp * 1000) <= range[1].getTime()) {

      if (Object.keys(cumul_data_chars).length == 0) {
            keys.forEach(function(k){
              d.total_char += d[k].chars;
              cumul_data_chars[k] = d[k].chars;
            });
          } else {
          //d.timestamp = d['timestamp'];
            keys.forEach(function(k){
              d.total_char += d[k].chars;
              cumul_data_chars[k] += d[k].chars;
            });
        } 
      }
    });

    min_timestamp = d3.min(stacked_data.map(function(d) { if (d.total_char > 0) return d.timestamp; }));
    max_timestamp = d3.max(stacked_data.map(function(d) { if (d.total_char > 0) return d.timestamp; }));

    var cumul_data_pie_chars_ = transform(cumul_data_chars, keys);
    cumul_data_pie_chars = apply_enabled_participant(cumul_data_pie_chars_);

    path = donut.selectAll('path').data(pie(cumul_data_pie_chars));
  } 

  // Updating the date display
  update_date_display(min_timestamp, max_timestamp);

  // Updating the donut chart 
  path.transition()
    .duration(750)
    .attrTween('d', compute_tween_arc);
}

function zoomed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') return;
  // ignore zoom-by-brush

  // We don't want to do this if the zoom was triggered by a manual change date by the user,
  // because in this case the d3.event.transform object doesn't exist. Apparently, this only
  // happens when d3.event.sourceEvent.type = 'click'!
  if (d3.event.sourceEvent.type !== 'click') {
  // Updating the time domain with the selected range
    var t = d3.event.transform;
    x.domain(t.rescaleX(x2).domain());
  }

  // Depending on the current data type, we compute the new data to display in the donut chat
  if (data_type === 'messages') {
    var cumul_data_messages = {};

    stacked_data.forEach(function(d, i){
      d.total_message = 0;

      // Additional condition (compared to similar code in init) to keep data only from selected range
      if ((d.timestamp * 1000) >= x.domain()[0].getTime() && 
          (d.timestamp * 1000) <= x.domain()[1].getTime()) {

      if (Object.keys(cumul_data_messages).length == 0) {
            keys.forEach(function(k){
              d.total_message += d[k].messages;
              cumul_data_messages[k] = d[k].messages;
            });
          } else {
          //d.timestamp = d['timestamp'];
            keys.forEach(function(k){
              d.total_message += d[k].messages;
              cumul_data_messages[k] += d[k].messages;
            });
        } 
      }
    });

    var cumul_data_pie_messages_ = transform(cumul_data_messages, keys);
    cumul_data_pie_messages = apply_enabled_participant(cumul_data_pie_messages_);

    path = donut.selectAll('path').data(pie(cumul_data_pie_messages));
  } else {
    var cumul_data_chars = {};

    stacked_data.forEach(function(d, i){
      d.total_char = 0;
      d.timestamp = d.timestamp;

      // Additional condition (compared to similar code in init) to keep data only from selected range
      if ((d.timestamp * 1000) >= x.domain()[0].getTime() && 
          (d.timestamp * 1000) <= x.domain()[1].getTime()) {

      if (Object.keys(cumul_data_chars).length == 0) {
            keys.forEach(function(k){
              d.total_char += d[k].chars;
              cumul_data_chars[k] = d[k].chars;
            });
          } else {
          //d.timestamp = d['timestamp'];
            keys.forEach(function(k){
              d.total_char += d[k].chars;
              cumul_data_chars[k] += d[k].chars;
            });
        } 
      }
    });

    var cumul_data_pie_chars_ = transform(cumul_data_chars, keys);
    cumul_data_pie_chars = apply_enabled_participant(cumul_data_pie_chars_);

    path = donut.selectAll('path').data(pie(cumul_data_pie_chars));
  }

  // We are recomputing the data to display in the main chart area depending on the data type
  if (data_type === 'messages') {
    y.domain([0, d3.max(stacked_data, function(d) { return d.total_message; })]).nice();
    min_timestamp = d3.min(stacked_data.map(function(d) { if (d.total_message > 0) return d.timestamp; }));
    max_timestamp = d3.max(stacked_data.map(function(d) { if (d.total_message > 0) return d.timestamp; }));
    new_layer = stack_message(stacked_data);
  } else {
    y.domain([0, d3.max(stacked_data, function(d) { return d.total_char; })]).nice();
    min_timestamp = d3.min(stacked_data.map(function(d) { if (d.total_char > 0) return d.timestamp; }));
    max_timestamp = d3.max(stacked_data.map(function(d) { if (d.total_char > 0) return d.timestamp; }));
    new_layer = stack_char(stacked_data);
  }

  // Updating the main chart x-axis (time axis)
  focus.select('.axis--x').call(xAxis);

  // Updating the display of the brush (blue zoom rectangle)
  // Depending on the type of event which triggered the zoom, we apply the real transformation,
  // or a good enough approximation using the x2 domain which, thankfully, never changes.
  if (d3.event.sourceEvent.type !== 'click') {
    context.select('.brush').call(brush.move, x.range().map(t.invertX, t));
  } else {
    context.select('.brush').call(brush.move, [x2(new Date(min_timestamp * 1000)), x2(new Date(max_timestamp * 1000))]);
  }

  // Updating the y domain of the charts
  y2.domain(y.domain());
  d3.select('.axis--y')
    .transition()
    .duration(750)
    .call(d3.axisLeft(y));

  update_donut_and_chart();

    console.log('zoomed new min_timestamp ' + min_timestamp);
    console.log('zoomed new max_timestamp ' + max_timestamp);

  // Updating the date display
  update_date_display(min_timestamp, max_timestamp);
}

function show_pie_tooltip(d) {
  if (data_type === 'messages') {
    var total_message = d3.sum(cumul_data_pie_messages.map(function(d) {
      return (d.enabled) ? d.count : 0;
    }));

    var percent = Math.round(1000 * d.data.count / total_message) / 10;
    tooltip.select('.name').html(d.data.name);
    tooltip.select('.count').html(d.data.count + ' messages');
    tooltip.select('.percent').html(percent + '% of ' + total_message);
    tooltip.style('display', 'block');
  } else {
    var total_char = d3.sum(cumul_data_pie_chars.map(function(d) {
      return (d.enabled) ? d.count : 0;
    }));

    var percent = Math.round(1000 * d.data.count / total_char) / 10;
    tooltip.select('.name').html(d.data.name);
    tooltip.select('.count').html(d.data.count + ' characters');
    tooltip.select('.percent').html(percent + '% of ' + total_char);
    tooltip.style('display', 'block');
  }
}

function hide_pie_tooltip() {
    tooltip.style('display', 'none');
}

// This function is called when a participant is clicked.
// It toggles the status of the participant and updates the charts accordingly.
function toggle_participant(name) {
  var rect = d3.select(this);
  var enabled = true;

  // Applying the new style to the rect (filled or not)
  // and keeping track on how many participants have been deactivated
  // to ensure that there will always be at least two activated participants.
  if (rect.attr('class') === 'disabled') {
    rect.attr('class', '');
    currentTotalEnabled++;
  } else {
    if (currentTotalEnabled > 2) {
      rect.attr('class', 'disabled');
      d3.select('#activateAllRect').attr('class', 'disabled');
      enabled = false;
      currentTotalEnabled--;
    }
  }

  // Applying the style to the activeAll button 
  if (currentTotalEnabled == keys.length) {
    d3.select('#activateAllRect').attr('class', '');
  }  

  // Applying the enabled status to the clicked participant
  enabledParticipants[name] = enabled;

  // Computing the new layers and donut segments depending on the data type
  if (data_type === 'messages') {
    apply_enabled_participant(cumul_data_pie_messages);
    path = donut.selectAll('path').data(pie(cumul_data_pie_messages));
    new_layer = stack_message(stacked_data);
  } else {
    apply_enabled_participant(cumul_data_pie_chars);
    path = donut.selectAll('path').data(pie(cumul_data_pie_chars));
    new_layer = stack_char(stacked_data);
  }

  update_donut_and_chart();
}

// This function is called when the "ActivateAll" button is clicked.
// It reactivates every participant and updates the charts accordingly.
function reactivate_all() {
  var enabled = true;

  // Applying the new style to all the rects in the legend (filled)
  if (d3.select(this).attr('class') === 'disabled') {
      var rects = d3.select('.legend').selectAll('rect');
      rects.attr('class', '');
      d3.select(this).attr('class', '');
  } 

  // Applying the enabled status to each participant
  keys.forEach(function(k) {
    enabledParticipants[k] = enabled;
  });

  currentTotalEnabled = keys.length;

  if (data_type === 'messages') {
    apply_enabled_participant(cumul_data_pie_messages);
    path = donut.selectAll('path').data(pie(cumul_data_pie_messages));
    new_layer = stack_message(stacked_data);
  } else {
    apply_enabled_participant(cumul_data_pie_chars);
    path = donut.selectAll('path').data(pie(cumul_data_pie_chars));
    new_layer = stack_char(stacked_data);
  }

  update_donut_and_chart();
}

// This function switches between messages and charts dataset and updates the charts accordingly. 
function toggle_data_type() {
  var init = true;

  stacked_data.forEach(function(d, i){
    d.total_char = 0;
    d.total_message = 0;

    if ((d.timestamp * 1000) >= x.domain()[0].getTime() && 
        (d.timestamp * 1000) <= x.domain()[1].getTime()) {

      if (init) {
          keys.forEach(function(k){
            d.total_char += d[k].chars;
            d.total_message += d[k].messages;
          });
          init = false;
        } else {
          keys.forEach(function(k){
            d.total_char += d[k].chars;
            d.total_message += d[k].messages;
          });
        } 
    }
  });

  if (data_type === 'messages') {
    data_type = 'chars'

    y.domain([0, d3.max(stacked_data, function(d) { return d.total_char; })]).nice();
    y2.domain([0, d3.max(context_stacked_data, function(d) { return d.total_char; })]).nice();

    apply_enabled_participant(cumul_data_pie_chars);
    path = donut.selectAll('path').data(pie(cumul_data_pie_chars));
    new_layer = stack_char(stacked_data);
  } else {
    data_type = 'messages'

    y.domain([0, d3.max(stacked_data, function(d) { return d.total_message; })]).nice();
    y2.domain([0, d3.max(context_stacked_data, function(d) { return d.total_message; })]).nice();

    apply_enabled_participant(cumul_data_pie_messages);
    path = donut.selectAll('path').data(pie(cumul_data_pie_messages));
    new_layer = stack_message(stacked_data);
  }

  // Updating the y domain of the charts
  d3.select('.axis--y')
    .transition()
    .duration(750)
    .call(d3.axisLeft(y));

  update_donut_and_chart();

  // Updating the context chart (slight different, but noticeable)
  context.selectAll('.area')
    .datum(context_stacked_data)
    .transition()
    .duration(750)
    .attr('d', area2);
}

/* Utility functions */

// This function does the actual updating of the donut and the main area chart, with a transition. 
function update_donut_and_chart() {
  // Updating the donut chart
  path.transition()
    .duration(750)
    .attrTween('d', compute_tween_arc);

  // Updating the layers of the main chart
  var t;
  focus.selectAll('.area')
    .data((t = new_layer, new_layer = current_layer, current_layer = t))
    .transition()
    .duration(750)
    .attr('d', area);
}

// This function just updates the toggle buttons color, the actual logic used to do the switch is 
// in the toggle_data_type function.
function update_button_colors(button, parent) {
  parent.selectAll('rect')
    .attr('fill', defaultColor)

  button.select('rect')
    .attr('fill', pressedColor)
}

// Moves data around a bit. Used with apply_enabled_participant().
function transform(targetObj, keyArray) {
    let resultArray = [];
    
    if (!targetObj || !keyArray) { return resultArray; }
    
    for (let i = 0; i < keyArray.length; i++) {
        if (!targetObj.hasOwnProperty(keyArray[i])) { continue; }
        let item = {};
        item['name'] = keyArray[i]; 
        item['count'] = targetObj[keyArray[i]];
        resultArray.push(item);
    }

    return resultArray;
}

function apply_enabled_participant(ar) {
  let resultArray = [];

  for (var i = 0; i < ar.length; i++) {
    let item = ar[i];

    if (enabledParticipants[ar[i].name]) {
      item['enabled'] = true;
    } else {
      item['enabled'] = false;
    }
    resultArray.push(item);
  }

  return resultArray;
}

function compute_tween_arc(d) {
  var interpolate = d3.interpolate(this._current, d);
  this._current = interpolate(0);
  return function(t) {
    return arc(interpolate(t));
  };
}

function update_date_display(start_ts, end_ts) {
  console.log('Received order to update date displays with : ' + time_formatter(start_ts) + ' /// ' + time_formatter(end_ts));
  d3.select('#date_start_display').text('Start of selection: ' + time_formatter(start_ts));
  d3.select('#date_end_display').text('End of selection: ' + time_formatter(end_ts));
}

function time_formatter(ts) {
  var a = new Date(ts * 1000);

  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();

  var time = date + ' ' + month + ' ' + year;
  return time;
}

function get_date_from_user(d, i, nodes) {

  var id = this.__data__.id;
  var date;

  if (id === dates_display_data[0].id) {
    date = window.prompt('Please specify a start date (YYYY/MM/DD or DD/MM/YYYY).' + 
      '\nThe data is computed per week.' +
      '\nThe week closest to your input will be taken as the new start date.');
  } else {
    date = window.prompt('Please specify an end date (YYYY/MM/DD or DD/MM/YYYY).' + 
      '\nThe data is computed per week.' + 
      '\nThe week closest to your input will be taken as the new end date.');
  }

  console.log('received for ' + dates_display_data[0].id + ': ' + date);

  if (is_valid_date(date)) {
    console.log('valid date : ' + parse_date(date) / 1000);
    if (id === dates_display_data[0].id) {
      var tentative_min_timestamp = find_closest_ts(parse_date(date) / 1000);
      if (tentative_min_timestamp > max_timestamp) { 
        console.log('Tentative min timestamp above max timestamp, returning.'); 
        return; 
      }
      min_timestamp = tentative_min_timestamp;
      console.log('Found closest for min : ' + min_timestamp);
      console.log(new Date(min_timestamp * 1000));
    } else {
      var tentative_max_timestamp = find_closest_ts(parse_date(date) / 1000);
      if (tentative_max_timestamp < min_timestamp) { 
        console.log('Tentative max timestamp below min timestamp, returning.'); 
        return; 
      }
      max_timestamp = tentative_max_timestamp;
      console.log('Found closest for max : ' + max_timestamp);
      console.log(new Date(max_timestamp * 1000));
    }
  }

  update_date_display(min_timestamp, max_timestamp);
  do_brushed(x(min_timestamp), x(max_timestamp), [new Date(min_timestamp * 1000), new Date(max_timestamp * 1000)]);

}

function is_valid_date(date) {
  var submitted_date = parse_date(date);
  if (submitted_date === undefined || isNaN(submitted_date)) return false;
  console.log('passed parsing');
  if (submitted_date < new Date(permanent_min_timestamp * 1000)) return false;
  console.log('passed min');
  if (submitted_date > new Date(permanent_max_timestamp * 1000)) return false;
  console.log('passed max');
  return true;
}

function find_closest_ts(ts){
    var arr = stacked_data.map(function(d) { return d.timestamp; });
    var closest = Math.max.apply(null, arr);

    for(var i = 0; i < arr.length; i++) {
        if(arr[i] >= ts && arr[i] < closest) closest = arr[i];
    }

    return closest;
}

function parse_date(str) {
  var dateParts = str.split("/");
  if (dateParts[0].length == 2) {
    return new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
  }
  if (dateParts[0].length == 4) {
    return new Date(dateParts[0], (dateParts[1] - 1), dateParts[2]);
  }
  return undefined;
}

function reset_date() {
  update_date_display(permanent_min_timestamp, permanent_max_timestamp);
  do_brushed(x(permanent_min_timestamp), x(permanent_max_timestamp), [new Date(permanent_min_timestamp * 1000), new Date(permanent_max_timestamp * 1000)]);
}