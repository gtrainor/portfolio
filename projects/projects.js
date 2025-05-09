import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');


const title = document.querySelector('.projects-title');
title.textContent = `${projects.length} Projects`;

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let selectedIndex = -1;

// Refactor all plotting into one function
function renderPieChart(projectsGiven) {
    // re-calculate rolled data
    let newRolledData = d3.rollups(
      projectsGiven,
      (v) => v.length,
      (d) => d.year,
    );
    // re-calculate data
    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    // re-calculate slice generator, arc data, arc, etc.
    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => arcGenerator(d));
    // TODO: clear up paths and legends
    let newSVG = d3.select('svg');
    let legend = d3.select('.legend');
    newSVG.selectAll('path').remove();
    legend.selectAll('li').remove();



    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    newArcs.forEach((arc,idx) => {
        newSVG.append('path').attr('d', arc).attr('fill', colors(idx)).on('click', () => {
            selectedIndex = selectedIndex === idx ? -1 : idx;
            newSVG.selectAll('path').attr('class', (_, tempIdx) => (selectedIndex === tempIdx ? 'selected' : ''));
            legend.selectAll('li').attr('class', (_, liIdx) => (selectedIndex === liIdx ? 'selected' : ''));

    
    // Filter projects based on the selected year (if any)
    if (selectedIndex === -1) {
        renderProjects(projects, projectsContainer, 'h2');
      } else {
        let selectedYear = newArcData[selectedIndex].data.label;
        
        let filteredProjects = projects.filter(project => project.year === selectedYear);

        renderProjects(filteredProjects, projectsContainer, 'h2');
      }
    });
    });
    
    newData.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${colors(idx)}`)
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
            .attr('class', selectedIndex === -1 ? '' : selectedIndex === idx ? 'selected' : '').on('click', () => {
                selectedIndex = selectedIndex === idx ? -1 : idx;

                newSVG.selectAll('path').attr('class', (_, tempIdx) => (selectedIndex === tempIdx ? 'selected' : ''));

                legend.selectAll('li').attr('class', (_, liIdx) => (selectedIndex === liIdx ? 'selected' : ''));
    
        
        // Filter projects based on the selected year (if any)
        if (selectedIndex === -1) {
            renderProjects(projects, projectsContainer, 'h2');
          } else {
            let selectedYear = newArcData[selectedIndex].data.label; 
            let filteredProjects = projects.filter(project => project.year === selectedYear);
    
            renderProjects(filteredProjects, projectsContainer, 'h2');
          }
        });
        
    });
    

  }
  let query = ''
  // Call this function on page load
  renderPieChart(projects);
    
    let searchInput = document.querySelector('.searchBar');
  searchInput.addEventListener('change', (event) => {

    let query = event.target.value;
    let filteredProjects = projects.filter((project) => {
        let matchesYear = selectedIndex === -1 || project.year === d3.select('svg').selectAll('path').data()[selectedIndex]?.data.label;
        let values = Object.values(project).join('\n').toLowerCase().includes(query.toLowerCase());
        return values && matchesYear;
      });
    // let filteredProjects = setQuery(event.target.value);
    // re-render legends and pie chart when event triggers
    renderProjects(filteredProjects, projectsContainer, 'h2');
    renderPieChart(filteredProjects);
  });

  

    
    

