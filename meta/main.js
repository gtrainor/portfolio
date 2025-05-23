import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), // or just +row.line
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
      }));
    return data;
  }
  
  function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/vis-society/lab-7/commit/' + commit,
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
      });
  }
  

  function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Number of files
    const numFiles = d3.groups(data, d => d.file).length;
    dl.append('dt').text('Number of files');
    dl.append('dd').text(numFiles);
  
    // Longest file (by lines)
    const fileLengths = d3.rollups(
      data,
      v => d3.max(v, d => d.line),
      d => d.file
    );
    const longestFileEntry = d3.greatest(fileLengths, d => d[1]);
    const longestFileLength = longestFileEntry?.[1];
    
  
    // Average line length (in characters)
    const avgLineLength = d3.mean(data, d => d.length);
    dl.append('dt').text('Average line length');
    dl.append('dd').text(avgLineLength.toFixed(2));
  
    // Time of day with most work
    const hours = d3.rollups(
      data,
      v => v.length,
      d => new Date(d.datetime).getHours()
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
    dl.append('dd').text(busiestPeriod);

    
  }



  function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
  }
   
  function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  }

  function createBrushSelector(svg) {
    svg.call(d3.brush().on('start brush end', brushed));
    svg.selectAll('.dots, .overlay ~ *').raise();
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }


  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  }

  
 
    function brushed(event) {
        const selection = event.selection;
      d3.selectAll('circle').classed('selected', (d) =>
        isCommitSelected(selection, d),
      );
    
      renderSelectionCount(selection);
      renderLanguageBreakdown(selection);
      }

      let xScale, yScale;
      function isCommitSelected(selection, commit) { 
        if (!selection) { 
            return false; 
        }
        const [x0, x1] = selection.map((d) => d[0]); 
        const [y0, y1] = selection.map((d) => d[1]); 
        const x = xScale(commit.datetime); 
        const y = yScale(commit.hourFrac); 
        return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
    
function renderScatterPlot(data, commits) {
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines); // Find the min and max lines edited
    const rScale = d3
    .scaleSqrt() // Change only this line
    .domain([minLines, maxLines])
    .range([2, 30]);    
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    const width = 1000;
    const height = 600; 
    const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

    
    xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();
    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);
    const dots = svg.append('g').attr('class', 'dots');

dots
.selectAll('circle')
.data(sortedCommits)
.join('circle')
.attr('cx', (d) => xScale(d.datetime))
.attr('cy', (d) => yScale(d.hourFrac))
.attr('r', (d) => rScale(d.totalLines))
.attr('fill', 'steelblue')
.style('fill-opacity', 0.7)
.on('mouseenter', (event, commit) => {
    d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
    renderTooltipContent(commit);
    updateTooltipVisibility(true);
    updateTooltipPosition(event);
})
.on('mouseleave', () => {
    d3.select(event.currentTarget).style('fill-opacity', 0.7);
    updateTooltipVisibility(false);
});
const margin = { top: 10, right: 10, bottom: 30, left: 20 };
const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  
  // Update scales with new ranges
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);
 // Create the axes
const xAxis = d3.axisBottom(xScale);
const yAxis = d3
  .axisLeft(yScale)
  .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

// Add X axis
svg
  .append('g')
  .attr('transform', `translate(0, ${usableArea.bottom})`)
  .call(xAxis);

// Add Y axis
svg
  .append('g')
  .attr('transform', `translate(${usableArea.left}, 0)`)
  .call(yAxis); 

  const gridlines = svg
  .append('g')
  .attr('class', 'gridlines')
  .attr('transform', `translate(${usableArea.left}, 0)`);

// Create gridlines as an axis with no labels and full-width ticks
gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

createBrushSelector(svg);

   }
   
   let data = await loadData();
   let commits = processCommits(data);
   

   renderCommitInfo(data, commits);
   renderScatterPlot(data, commits);

   function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });
  }
  

  