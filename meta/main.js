import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// --- Global Variables ---
let data = []; // Stores the raw loaded data
let commits = []; // Stores the processed commit objects (all commits)
let filteredCommits = []; // Stores commits filtered by the slider or scrollama

let xScale, yScale, rScale;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Constants for chart dimensions
const width = 1000;
const height = 600;
const margin = { top: 10, right: 10, bottom: 30, left: 50 }; // Increased left margin for y-axis labels
const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
};

let commitMaxTime; // Global variable for the max datetime for filtering

// --- Tooltip Functions ---
const tooltip = d3.select("body").append("div")
    .attr("id", "commit-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .html(`
        <a id="commit-link" target="_blank"></a><br/>
        <span id="commit-date"></span>
    `);

function updateTooltipVisibility(isVisible) {
    tooltip.transition().duration(200).style("opacity", isVisible ? 1 : 0);
}

function updateTooltipPosition(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 20) + "px");
}

function renderTooltipContent(commit) {
    tooltip.select('#commit-link')
        .attr('href', commit.url)
        .text(commit.id);
    tooltip.select('#commit-date')
        .text(commit.datetime?.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' }));
}

// --- Data Loading and Processing ---
async function loadData() {
    try {
        const loadedData = await d3.csv('loc.csv', (row) => ({
            ...row,
            line: +row.line,
            depth: +row.depth,
            length: +row.length,
            date: new Date(row.date + 'T00:00' + row.timezone),
            datetime: new Date(row.datetime),
        }));
        return loadedData;
    } catch (error) {
        console.error("Error loading loc.csv:", error);
        // Fallback to minimal dummy data if CSV fails to load
        return [
            { commit: "a", author: "User1", datetime: new Date("2023-01-01T10:00:00Z"), file: "file1.js", line: 10, depth: 1, length: 50, type: "JavaScript", timezone: "+0000" },
            { commit: "a", author: "User1", datetime: new Date("2023-01-01T10:00:00Z"), file: "file1.js", line: 11, depth: 1, length: 60, type: "JavaScript", timezone: "+0000" },
            { commit: "b", author: "User2", datetime: new Date("2023-01-15T14:30:00Z"), file: "file2.css", line: 5, depth: 1, length: 30, type: "CSS", timezone: "+0000" },
            { commit: "c", author: "User1", datetime: new Date("2023-02-01T09:00:00Z"), file: "file1.js", line: 12, depth: 1, length: 45, type: "JavaScript", timezone: "+0000" },
            { commit: "d", author: "User3", datetime: new Date("2023-02-10T11:00:00Z"), file: "file3.html", line: 20, depth: 1, length: 80, type: "HTML", timezone: "+0000" },
        ];
    }
}

function processCommits(rawData) {
    return d3
        .groups(rawData, (d) => d.commit)
        .map(([commitId, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            let ret = {
                id: commitId,
                url: 'https://github.com/vis-society/lab-7/commit/' + commitId,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: true,
                configurable: true
            });
            return ret;
        })
        .sort((a, b) => a.datetime - b.datetime); // **IMPORTANT**: Sort by datetime here
}

function renderCommitInfo(rawData, commitsToRender) {
  const statsDiv = d3.select('#stats');

  statsDiv.html('<h3>Commit Statistics</h3>');

  const dl = statsDiv.append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(rawData.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commitsToRender.length);

  const numFiles = d3.groups(rawData, d => d.file).length;
  dl.append('dt').text('Number of files');
  dl.append('dd').text(numFiles);

  const avgLineLength = d3.mean(rawData, d => d.length);
  dl.append('dt').text('Average line length');
  dl.append('dd').text(avgLineLength ? avgLineLength.toFixed(2) : 'N/A');

  const hours = d3.rollups(
    commitsToRender,
    v => d3.sum(v, d => d.totalLines),
    d => d.datetime.getHours()
  );

  function categorizeHour(hour) {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';
  }

  const periodCounts = d3.rollups(
    hours,
    v => d3.sum(v, d => d[1]),
    d => categorizeHour(d[0])
  );

  const busiestPeriod = d3.greatest(periodCounts, d => d[1])?.[0];
  dl.append('dt').text('Most work done during');
  dl.append('dd').text(busiestPeriod || 'N/A');
}

// --- Brush Selection Logic ---
function isCommitSelected(selection, commit) {
    if (!selection || !xScale || !yScale) {
        return false;
    }
    const [x0, y0] = selection[0];
    const [x1, y1] = selection[1];
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
        isCommitSelected(selection, d),
    );

    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
        ? filteredCommits.filter((d) => isCommitSelected(selection, d))
        : [];

    const countElement = document.querySelector('#selection-count');
    if (countElement) {
        countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
    } else {
        console.warn("Element with id 'selection-count' not found.");
    }
    return selectedCommits;
}

function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
        ? filteredCommits.filter((d) => isCommitSelected(selection, d))
        : [];
    const container = document.getElementById('language-breakdown');

    if (!container) {
        console.warn("Element with id 'language-breakdown' not found.");
        return;
    }

    container.innerHTML = '';

    if (selectedCommits.length === 0) {
        return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines);

    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type,
    );

    const dl = d3.select(container).append('dl');
    const sortedBreakdown = Array.from(breakdown.entries()).sort((a, b) => b[1] - a[1]);

    for (const [language, count] of sortedBreakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);
        dl.append('dt').text(language);
        dl.append('dd').text(`${count} lines (${formatted})`);
    }
}

// --- Scatter Plot Initialization ---
function renderScatterPlot(allCommitsData) {
    const svg = d3.select('#chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Initialize global scales based on ALL commits for fixed axis ranges
    xScale = d3.scaleTime()
        .domain(d3.extent(allCommitsData, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // **IMPORTANT**: Set rScale domain based on the full dataset, not filtered.
    rScale = d3.scaleSqrt()
        .domain(d3.extent(allCommitsData, (d) => d.totalLines))
        .range([2, 30]);

    // Create axis generators
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Append axis groups with classes
    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis') // Assign class for selection in update
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('class', 'y-axis') // Assign class for selection in update
        .call(yAxis);

    // Append gridlines group
    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Append dots group
    svg.append('g')
        .attr('class', 'dots');

    // Add brush functionality
    const brush = d3.brush()
        .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
        .on('start brush end', brushed);
    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    // Raise dots and other interactive elements above the brush overlay
    svg.selectAll('.dots, .brush .overlay ~ *').raise();
}

function updateScatterPlot(commitsToRender) {
  const svg = d3.select('#chart').select('svg');

  // Dynamically update the xScale domain based on the earliest commit and the current max time.
  // The min is always the first commit, max is commitMaxTime from scrollama.
  xScale.domain([d3.min(commits, (d) => d.datetime), commitMaxTime]);

  // Re-create axis generators (using global scales, which are now updated)
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
      .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Select the existing x-axis group and update
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove(); // Clear existing elements before redrawing
  xAxisGroup.call(xAxis);

  // Update existing y-axis and gridlines groups
  svg.select('g.y-axis').call(yAxis);
  svg.select('g.gridlines')
      .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // The rScale domain should ideally remain fixed based on the entire dataset
  // as set in renderScatterPlot, or if it must change, ensure it doesn't collapse.
  // If minLines and maxLines are the same, it causes issues.
  // We remove the update to rScale's domain here to keep it stable.
  // const [minLines, maxLines] = d3.extent(commitsToRender, (d) => d.totalLines);
  // rScale.domain([minLines === undefined ? 1 : minLines, maxLines === undefined ? 100 : maxLines]);


  const dots = svg.select('g.dots');
  // Sort by datetime first, then by totalLines (descending) for consistent drawing order
  const sortedCommits = d3.sort(commitsToRender, (d) => d.datetime, (d) => -d.totalLines);

  dots.selectAll('circle')
      .data(sortedCommits, d => d.id) // Use commit ID for keying
      .join(
          enter => enter.append('circle')
              .attr('cx', (d) => xScale(d.datetime))
              .attr('cy', (d) => yScale(d.hourFrac))
              .attr('r', (d) => rScale(d.totalLines))
              .attr('fill', 'steelblue')
              .style('fill-opacity', 0.7)
              .on('mouseenter', (event, commit) => {
                  d3.select(event.currentTarget).style('fill-opacity', 1);
                  renderTooltipContent(commit);
                  updateTooltipPosition(event);
                  updateTooltipVisibility(true);
              })
              .on('mouseleave', (event) => {
                  d3.select(event.currentTarget).style('fill-opacity', 0.7);
                  updateTooltipVisibility(false);
              }),
          update => update
              .attr('cx', (d) => xScale(d.datetime))
              .attr('cy', (d) => yScale(d.hourFrac))
              .attr('r', (d) => rScale(d.totalLines))
              .style('fill-opacity', 0.7),
          exit => exit.remove()
      );
}

// --- Time Filtering UI Logic (for slider, if still in use) ---
// This part is mostly for the slider, which might be secondary to scrollytelling.
// We'll adjust its initialization to avoid conflicts.
let commitProgress = 100;
let timeScale; // Declared globally

function initializeTimeFiltering() {
    // Only initialize if commits array is populated
    if (commits.length > 0) {
        timeScale = d3
            .scaleTime()
            .domain([
                d3.min(commits, (d) => d.datetime),
                d3.max(commits, (d) => d.datetime),
            ])
            .range([0, 100]);

        const commitProgressBar = d3.select("#commit-progress");
        // Ensure the slider element exists before trying to set its properties
        if (commitProgressBar.node()) {
            commitProgressBar.property("value", commitProgress);
            commitProgressBar.on("input", onTimeSliderChange);
        }
    }
    // IMPORTANT: Do NOT call onTimeSliderChange() here if Scrollama is the primary driver.
    // The initial state will be set by the DOMContentLoaded block and first onStepEnter.
}

function onTimeSliderChange() {
    const commitProgressBar = d3.select("#commit-progress");
    const commitTimeElement = d3.select("#commit-time");

    commitProgress = +commitProgressBar.property("value");
    commitMaxTime = timeScale.invert(commitProgress);

    // Ensure elements exist before updating
    if (commitTimeElement.node()) {
        commitTimeElement.text(
            commitMaxTime.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })
        );
    }

    // Filter the global 'commits' array
    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

    // Update the scatter plot and commit info with the filtered data
    updateScatterPlot(filteredCommits);
    renderCommitInfo(data, filteredCommits);
    renderSelectionCount(null); // Clear brush selection info on slider change
    renderLanguageBreakdown(null); // Clear language breakdown on slider change
    updateFileDisplay(filteredCommits)
}

function updateFileDisplay(commitsToRender) {
let lines = commitsToRender.flatMap((d) => d.lines);
let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    const totalFileLines = lines.length;
    const fileType = lines.length > 0 ? lines[0].type : "unknown";    return { name, lines, totalFileLines: totalFileLines, type: fileType };
  })
  .sort((a, b) => b.lines.length - a.lines.length);


  let filesContainer = d3
  .select('#files')
  .selectAll('div')
  .data(files, (d) => d.name)
  .join(
    // This code only runs when the div is initially rendered
    (enter) =>
      enter.append('div').call((div) => {
        div.append('dt').append('code');
        div.append('dd');
      }),
    )
    .attr('style', (d) => `--color: ${colors(d.type)}`);
// This code updates the div info
filesContainer.select('dt > code').text((d) => d.name);

filesContainer.select('dt').html((d) => {
  // This will render: <code>filename.ext</code> <small>123 lines</small>
  return `<code>${d.name}</code> <small>${d.totalFileLines} lines</small>`;
});

filesContainer.select('dd').html(''); // Clear the dd content before adding new dots

filesContainer
  .select('dd')
  .selectAll('div.loc')
  .data((d) => d.lines)
  .join('div')
  .attr('class', 'loc')
  .style('background-color', (d_line) => colors(d_line.type)),
  (update) => update
      .style('background-color', (d_line) => colors(d_line.type)),
  (exit) => exit.remove()
;}


// --- onStepEnter function (THIS IS THE KEY CHANGE for scrollytelling) ---
function onStepEnter(response) {
  // Log the commit date as requested
  console.log(response.element.__data__.datetime);

  // Get the data of the current step (commit)
  const currentCommit = response.element.__data__;

  // Set the global commitMaxTime to the datetime of the current commit
  // This ensures the plot shows all commits up to this point in time
  commitMaxTime = currentCommit.datetime;

  // Filter the global 'commits' array based on the current commit's datetime
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  // Update all relevant parts of the visualization with the newly filtered data
  updateScatterPlot(filteredCommits);
  renderCommitInfo(data, filteredCommits); // Pass rawData for total stats, filteredCommits for commit count
  renderSelectionCount(null); // Clear any brush selection info as the context changed
  renderLanguageBreakdown(null); // Clear language breakdown as the context changed
  updateFileDisplay(filteredCommits);
}


// --- Initialize Application ---
document.addEventListener('DOMContentLoaded', async () => {
  data = await loadData();
  // Ensure commits are sorted by datetime in processCommits
  commits = processCommits(data);

  // Initialize filteredCommits and commitMaxTime for the starting state
  // Set commitMaxTime to the very first commit's datetime or even earlier
  if (commits.length > 0) {
      commitMaxTime = d3.min(commits, (d) => d.datetime); // Start at the absolute earliest
      filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime); // This might be empty or just the first one.
  } else {
      filteredCommits = [];
      commitMaxTime = new Date(); // Fallback if no commits
  }

  // Render the initial scatter plot structure (called only once, with all commits for domain)
  renderScatterPlot(commits); // Pass ALL commits to establish the full domain correctly

  // Initial display of the scatter plot, stats, and files based on the initial filtered data
  // This ensures the plot starts in a defined state before any scrolling.
  updateScatterPlot(filteredCommits);
  renderCommitInfo(data, filteredCommits);
  renderSelectionCount(null);
  renderLanguageBreakdown(null);
  updateFileDisplay(filteredCommits);

  // --- Generate commit text for Scrollama steps ---
  // This must happen AFTER commits are loaded and processed
  if (commits.length > 0) { // Only create steps if there are commits
      d3.select('#scatter-story')
          .selectAll('.step')
          .data(commits)
          .join('div')
          .attr('class', 'step')
          .html(
            (d, i) => `
                <p>On ${d.datetime.toLocaleString('en', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}, I made <a href="${d.url}" target="_blank">${
                  i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
                }</a>.
                I edited ${d.totalLines} lines across ${
                  d3.rollups(
                    d.lines,
                    (D) => D.length,
                    (d) => d.file,
                  ).length
                } files.
                Then I looked over all I had made, and I saw that it was very good.</p>
                `,
          );
  }

  // --- Setup Scrollama ---
  // This must happen AFTER step elements are created
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scatter-story .step', // Target steps within #scatter-story
      offset: 0.5,
      debug: false, // Set to true to see Scrollama debug indicators
    })
    .onStepEnter(onStepEnter);

  // Resize event listener for Scrollama
  window.addEventListener('resize', scroller.resize);

  // Optional: Initialize slider if you still want it functional alongside scrollytelling.
  // If scrollytelling is the primary interaction, you might omit this or make the slider
  // only active if scrollytelling is not.
  initializeTimeFiltering(); // Call this without triggering onTimeSliderChange immediately
});