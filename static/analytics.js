
(function () {
  const ANALYTICS_STATE = {
    type: "users",
    range: "7d"
  };
function formatDate(dateStr){
  if(!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString();
}

let USERS = [];
const SvgInitActivi = {
   quest: `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="16" height="16">
              <path d="M3 5.5L8 4v15l-5 1.5V5.5z"  />
              <path d="M9 4l6 1.5v15L9 19V4z" />
              <path d="M16 5.5l5-1.5v15l-5 1.5V5.5z"/>
            </svg>
   `,


   message: `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 108.31" fill="currenColor" stroke="currentColor" class="message-render">
              <path class="cls-1" d="M51.46,93.86c12.9,12.44,31.14,16.2,49.38,8.43l15.31,6-5.07-12.06c17-13.63,14-32.35,1.44-45.11A44.05,44.05,0,0,1,107.65,65,51.25,51.25,0,0,1,93.58,81,62.69,62.69,0,0,1,73.92,91a70.44,70.44,0,0,1-22.46,2.9ZM31.58,54.07a3.11,3.11,0,0,1,0-6.21H61.51a3.11,3.11,0,0,1,0,6.21Zm0-17.22a3.11,3.11,0,0,1,0-6.21H74.34a3.11,3.11,0,0,1,0,6.21ZM54.28,0h0C68.81.47,81.8,5.62,91.09,13.59c9.49,8.13,15.17,19.2,14.82,31.27v0C105.54,57,99.19,67.71,89.22,75.28,79.44,82.7,66.15,87.07,51.66,86.65A63.91,63.91,0,0,1,40,85.24a60.48,60.48,0,0,1-9.87-3L6.69,91.44l7.83-18.63A44,44,0,0,1,4,59.5,36.67,36.67,0,0,1,0,41.79C.38,29.7,6.73,19,16.7,11.4,26.48,4,39.78-.4,54.26,0Zm-.15,6.18h-.05C41,5.83,29.14,9.72,20.44,16.32,11.92,22.78,6.5,31.84,6.2,42A30.49,30.49,0,0,0,9.55,56.71,38.76,38.76,0,0,0,20.17,69.47L22,70.93,18.08,80.3l12.08-4.75,1.17.5a55.08,55.08,0,0,0,9.91,3.13,58.52,58.52,0,0,0,10.59,1.29c13,.38,25-3.51,33.66-10.12C94,63.89,99.42,54.84,99.73,44.72v0c.29-10.11-4.56-19.45-12.66-26.4C78.79,11.19,67.16,6.61,54.15,6.21Z"/>
            </svg>

   `,

   joinedplatform: `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" lass="user-joined" fill="currentColor" aria-hidden="true" width="14.5" height="14.5">
                  <path transform="scale(0.046875)" d="M159.131,169.721c5.635,58.338,43.367,96.867,96.871,96.867c53.502,0,91.23-38.53,96.867-96.867l7.988-63.029 C365.812,44.768,315.281,0,256.002,0c-59.281,0-109.812,44.768-104.86,106.692L159.131,169.721z"/>
                  <path transform="scale(0.046875)" d="M463.213,422.569l-3.824-24.35c-3.203-20.417-16.035-38.042-34.475-47.361l-80.473-40.693 c-2.519-1.274-4.57-3.194-6.289-5.338c-23.297,24.632-51.6,39.12-82.15,39.12c-30.549,0-58.856-14.488-82.152-39.12 c-1.719,2.144-3.77,4.064-6.289,5.338l-80.472,40.693c-18.442,9.319-31.272,26.944-34.475,47.361l-3.826,24.35 c-1.363,8.692,0.436,21.448,8.222,27.825C67.42,458.907,105.875,512,256.002,512c150.125,0,188.578-53.093,198.988-61.606 C462.779,444.017,464.576,431.261,463.213,422.569z"/>
              </svg> 
   `,


   level: `
                    <svg viewBox="0 0 24 24" width="16" height="16"   xmlns="http://www.w3.org/2000/svg" class="star" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z" />
                    </svg>   
   `
};
function renderAnalyticsChart(type = "users", range = "7d", backend = null) {

  let rawData;
  let svgId;
  let metricLabels;


  console.log("Backend:", backend)
  console.log("type of:", type)

  if (type === "users") {

    svgId = "userGrowthChart";

    rawData = backend?.chart || {
      total: [],
      active: [],
      new: []
    };

    metricLabels = {
      total: "Total Users",
      active: "Active Users",
      new: "New Users"
    };

  }

  else if (type === "quests") {

    svgId = "questGrowthChart";

    rawData = backend || {
      started: [],
      completed: [],
      abandoned: []
    };

    console.log("Rawdata:", rawData)

    metricLabels = {
      started: "Started",
      completed: "Completed",
      abandoned: "Abandoned"
    };

  }

  else if (type === "chats") {

    svgId = "chatGrowthChart";

    rawData = backend || {
      labels: [],
      messages: [],
      members: [],
      engagement: []
    };

    metricLabels = {
      messages: "Total Messages",
      members: "Active Members",
      engagement: "Messages per Member"
    };

  }

  ChartEngine.setTarget(svgId);
  ChartEngine.render(rawData, range, metricLabels);
}

function timeAgo(dateStr) {

  if (!dateStr) return "";

  if (!dateStr.endsWith("Z") && !dateStr.includes("+")) {
    dateStr = dateStr + "Z";
  }

  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

  if (seconds < 5) return "just now";

  const intervals = [
    { label: "year",   secs: 31536000 },
    { label: "month",  secs: 2592000 },
    { label: "day",    secs: 86400 },
    { label: "hr",     secs: 3600 },
    { label: "min",    secs: 60 },
    { label: "sec",    secs: 1 }
  ];

  for (const i of intervals) {
    const count = Math.floor(seconds / i.secs);
    if (count >= 1) {
      return count + " " + i.label + (count > 1 ? "s" : "") + " ago";
    }
  }

  return "";
}




  function showSegmentTable(type){

    const card = document.getElementById("segmentsCard");

    card.classList.add("active");

    document.getElementById("segmentsView").style.display = "none";
    document.getElementById("segmentsTable").style.display = "block";

    renderUsers(type);

  }

function renderUsers(type){

  const tbody = document.querySelector("#segmentsTable tbody");

  const filtered = USERS.filter(u => u.status === type);

  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${timeAgo(u.last)}</td>
      <td>${formatDate(u.joined)}</td>
      <td><span class="badge ${u.status}">${u.status}</span></td>
    </tr>
  `).join("");

}

  const ChartEngine = (() => {

    let svg = null;
    let gridG, linesG, xLabelsG, yLabelsG;
    let crosshairG = null;
    let crosshairLine = null;


    let tooltip = null;


    function setTarget(id){

      svg = document.getElementById(id);

      if(!svg) return;

      gridG   = svg.querySelector(".grid");
      linesG  = svg.querySelector(".lines");
      xLabelsG = svg.querySelector(".x-labels");
      yLabelsG = svg.querySelector(".y-labels");

      crosshairG = svg.querySelector(".crosshair");

      tooltip = svg.parentElement.querySelector(".chart-tooltip");

      /* ✅ ALWAYS RESET */
      crosshairLine = null;

      if(crosshairG){

        crosshairG.innerHTML = ""; // remove old line

        crosshairLine = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );

        crosshairLine.setAttribute("class","crosshair-line");

        crosshairLine.style.opacity = 0;

        crosshairG.appendChild(crosshairLine);
      }
    }




    
    const HEIGHT = 260;

    const PADDING = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 40
    };



    let hiddenMetrics = new Set();
    let resizeObserver = null;
    let lastData = null;

    let METRICS = [];

    /* ---------- LABELS ---------- */


    /* ---------- NORMALIZE ---------- */

    function normalizeData(raw){

      const labels = raw.labels || [];

      const series = {};

      Object.keys(raw).forEach(key => {

        if (key === "labels") return;

        if (Array.isArray(raw[key])) {
          series[key] = raw[key];
        }

      });

      return { labels, series };
    }

    /* ---------- PATH BUILDER (CURVED) ---------- */

    function buildPath(values, scaleX, scaleY){

      let path = "";

      values.forEach((v,i)=>{

        const x = scaleX(i);
        const y = scaleY(v);

        if(i === 0){
          path += `M ${x},${y}`;
        }else{

          const prevX = scaleX(i-1);
          const prevY = scaleY(values[i-1]);

          const cx = (prevX + x) / 2;

          path += ` C ${cx},${prevY} ${cx},${y} ${x},${y}`;
        }

      });

      return path;
    }

    /* ---------- DRAW ---------- */

    function draw(data){

      if(!svg) return;

      lastData = data;

      const rect = svg.getBoundingClientRect();

      const WIDTH = rect.width || 600;

      const chartWidth  = WIDTH - PADDING.left - PADDING.right;
      const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;

      svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);

      gridG.innerHTML   = "";
      linesG.innerHTML  = "";
      xLabelsG.innerHTML = "";
      yLabelsG.innerHTML = "";

      const labels = data.labels;
      const series = data.series;

      const allValues = Object.values(series)
        .flat()
        .filter(v => typeof v === "number");

      const maxVal = Math.max(...allValues, 10) * 1.15;

      const stepX = chartWidth / Math.max(labels.length - 1, 1);

      const scaleX = i => PADDING.left + stepX * i;

      const scaleY = v =>
        PADDING.top +
        chartHeight -
        (v / maxVal) * chartHeight;

      /* ---------- GRID + Y ---------- */

      const ySteps = 4;

      for(let i=0;i<=ySteps;i++){

        const y = PADDING.top + (chartHeight / ySteps) * i;
        const value = Math.round(maxVal - (maxVal / ySteps) * i);

        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );

        line.setAttribute("x1", PADDING.left);
        line.setAttribute("x2", WIDTH - PADDING.right);
        line.setAttribute("y1", y);
        line.setAttribute("y2", y);

        gridG.appendChild(line);

        const label = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );

        label.setAttribute("x", PADDING.left - 10);
        label.setAttribute("y", y + 4);
        label.setAttribute("text-anchor", "end");
        label.setAttribute("class","axis-text");

        label.textContent = value.toLocaleString();

        yLabelsG.appendChild(label);
      }

      /* ---------- X LABELS ---------- */

      labels.forEach((lab,i)=>{

        const x = scaleX(i);

        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );

        text.setAttribute("x", x);
        text.setAttribute("y", HEIGHT - 8);
        text.setAttribute("text-anchor","middle");
        text.setAttribute("class","axis-text");

        text.textContent = lab;

        xLabelsG.appendChild(text);
      });

      /* ---------- LINES ---------- */

      METRICS.forEach(m=>{

        if(hiddenMetrics.has(m.key)) return;

        const values = series[m.key];

        const pathEl = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );

        pathEl.setAttribute(
          "d",
          buildPath(values, scaleX, scaleY)
        );

        pathEl.setAttribute(
          "class",
          `line-path ${m.class}`
        );

        pathEl.dataset.metric = m.key;

        linesG.appendChild(pathEl);

      });

      setupHover(labels, series, scaleX, scaleY, stepX);
    }

    /* ---------- HOVER ---------- */

    function setupHover(labels, series, scaleX, scaleY, stepX){

      if(!tooltip) return;

      let side = "right"; // remembers last side
      const container = svg.parentElement;

      function smartPosition(clientX, clientY){

        const containerRect = container.getBoundingClientRect();

        const tipRect = tooltip.getBoundingClientRect();

        const tipWidth  = tipRect.width  || 120;
        const tipHeight = tipRect.height || 50;

        const containerWidth  = containerRect.width;
        const containerHeight = containerRect.height;

        const cursorX = clientX - containerRect.left;
        const cursorY = clientY - containerRect.top;

        let left;
        let top;

        /* ---------- SIDE LOCK LOGIC ---------- */

        if(side === "right"){

          left = cursorX + 12;

          // if overflow → flip to left
          if(left + tipWidth > containerWidth){
            side = "left";
            left = cursorX - tipWidth - 12;
          }

        }else{

          left = cursorX - tipWidth - 12;

          // if overflow → flip back to right
          if(left < 0){
            side = "right";
            left = cursorX + 12;
          }

        }

        /* clamp safety */
        if(left < 0) left = 6;
        if(left + tipWidth > containerWidth){
          left = containerWidth - tipWidth - 6;
        }

        /* ---------- VERTICAL ---------- */

        top = cursorY - 10;

        if(top < 0){
          top = cursorY + 14;
        }

        if(top + tipHeight > containerHeight){
          top = containerHeight - tipHeight - 6;
        }

        tooltip.style.left = left + "px";
        tooltip.style.top  = top + "px";
      }


      svg.onmousemove = e => {

        const rect = svg.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if(crosshairLine){

          const clampedX = Math.max(
            PADDING.left,
            Math.min(
              rect.width - PADDING.right,
              x
            )
          );

          crosshairLine.setAttribute("x1", clampedX);
          crosshairLine.setAttribute("x2", clampedX);

          crosshairLine.setAttribute("y1", PADDING.top);
          crosshairLine.setAttribute(
            "y2",
            HEIGHT - PADDING.bottom
          );

          crosshairLine.style.opacity = 1;
        }
                const rawIndex = (x - PADDING.left) / stepX;

        const i1 = Math.floor(rawIndex);
        const i2 = Math.min(i1 + 1, labels.length - 1);

        const t = rawIndex - i1;

        if(i1 < 0 || i1 >= labels.length) return;

        /* interpolate values */
        function lerp(a,b,t){ return a + (b-a)*t; }

        const values = {};

        Object.keys(series).forEach(metric => {

          const v1 = series[metric][i1] ?? 0;
          const v2 = series[metric][i2] ?? v1;

          values[metric] = Math.round(lerp(v1,v2,t));
        });

        const label = labels[i1];

        tooltip.style.opacity = 1;

        function row(metric, label, value){

          if(hiddenMetrics.has(metric)) return "";

          return `
            <div class="tt-row">
              <span class="tt-dot ${metric}"></span>
              <span>${label}</span>
              <span>${value.toLocaleString()}</span>
            </div>
          `;
        }

        let rows = "";

        Object.keys(CURRENT_LABELS).forEach(metric => {

          if(values[metric] == null) return;

          const labelName =
            CURRENT_LABELS[metric] || metric;

          rows += row(metric, labelName, values[metric]);

        });

        tooltip.innerHTML = `
          <div class="tt-title">${label}</div>
          ${rows}
        `;



        smartPosition(e.clientX, e.clientY);
      };

      svg.onmouseleave = () => {

        tooltip.style.opacity = 0;

        if(crosshairLine){
          crosshairLine.style.opacity = 0;
        }
      };

    }


    /* ---------- RENDER ---------- */

    let CURRENT_LABELS = {};


    function render(rawData, range, labelsMap = {}){


      CURRENT_LABELS = labelsMap;

      const data = normalizeData(rawData);

      METRICS = Object.keys(data.series).map(key => ({
        key,
        class: "line-" + key
      }));

      console.log(data);


      draw(data);
    }


    function toggleMetric(metric){

      if(hiddenMetrics.has(metric)){
        hiddenMetrics.delete(metric);
      }else{
        hiddenMetrics.add(metric);
      }

      if(lastData) draw(lastData);
    }

    return {
      setTarget,
      render,
      toggleMetric
    };

  })();

const MappedQuestSc = {
  failed: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 508.33">
      <path fill="#EB0100" fill-rule="evenodd" d="M317.99 323.62c-17.23-19.89-35.3-40.09-54.23-60.09-62.06 59.35-119.53 126.18-161.12 201.73-51.02 92.68-126.31 16.84-92.15-50.33 27.46-61.28 98.07-146.3 182.94-220.07-46.74-41.72-97.97-79.34-154.08-107.07C-42.76 47.2 19.97-20.82 79.37 6.16c50.04 19.82 119.09 70.85 182.26 134.32 63.11-45.86 129.55-81.8 189.45-95.87 13-3.06 50.95-11.33 59.69 1.04 3.29 4.67-.33 11.68-7.08 19.29-22.99 25.96-84.78 67.12-114.72 90.82-21.61 17.11-43.55 34.99-65.37 53.71 23.2 28.81 43.94 58.64 60.47 88.17 14.37 25.66 25.55 51.1 32.42 75.46 3.14 11.13 11.75 43.64 1.38 51.66-3.91 3.03-10.11.16-16.95-5.38-23.34-18.89-61.29-70.77-82.93-95.76z"/>
    </svg>
  `,

  completed: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 113.48 122.88" width="16" height="16">
      <path fill="#f39d00" d="M3.21,18.74H19.86q0-4,.06-8.26V0H93.05V10.49c0,2.92,0,5.66,0,8.26h17.24a3.08,3.08,0,0,1,3.07,2.93,77.67,77.67,0,0,1-.4,13.9A34,34,0,0,1,109.11,48a21.77,21.77,0,0,1-8.8,8.6A31.91,31.91,0,0,1,86.41,60C83.14,65.43,78.78,68,73.68,72.67c-6.17,4.71-10.81,8.26-7.2,19.13h5.39a7.84,7.84,0,0,1,7.82,7.82v3.15h.77A7.69,7.69,0,0,1,85.91,105h0a7.67,7.67,0,0,1,2.26,5.45v5.23a1.77,1.77,0,0,1-1.77,1.77H26.58a1.77,1.77,0,0,1-1.77-1.77v-5.23A7.66,7.66,0,0,1,27.07,105h0a7.66,7.66,0,0,1,5.44-2.26h.77V99.62a7.75,7.75,0,0,1,2.3-5.51v0a7.81,7.81,0,0,1,5.51-2.29h6.06c3.22-10.26-1-13.58-6.83-18.17A44.47,44.47,0,0,1,27.34,60,31.87,31.87,0,0,1,13,56.54a21.47,21.47,0,0,1-8.73-8.6A34.07,34.07,0,0,1,.51,35.58,78.1,78.1,0,0,1,.13,21.9v-.08a3.08,3.08,0,0,1,3.09-3.08ZM92.71,30a121.67,121.67,0,0,1-2,18,15.17,15.17,0,0,0,5-1.9,10.49,10.49,0,0,0,3.69-3.89,18,18,0,0,0,1.93-6,45.37,45.37,0,0,0,.5-6.25H92.71ZM20.12,30H12a49.78,49.78,0,0,0,.45,6.27,18.41,18.41,0,0,0,1.8,6,10.13,10.13,0,0,0,3.57,3.88A14.57,14.57,0,0,0,22.54,48a92,92,0,0,1-2.42-18Z"/>
      
      <path fill="#f9c809" d="M20.08,21.82H3.21C2.75,31.1,3.34,40,7,46.43c3.43,6.11,9.7,10.15,20.62,10.46a27.9,27.9,0,0,1-3.48-5.51c-6.56-.88-10.36-3.59-12.54-7.67S8.94,34.32,8.94,28.14a1.23,1.23,0,0,1,1.23-1.23h9.91V21.82Zm72.77,5.1h10.82a1.23,1.23,0,0,1,1.23,1.22c0,6.2-.56,11.54-2.84,15.6s-6.16,6.75-12.7,7.64a25.38,25.38,0,0,1-3.69,5.52c11-.29,17.29-4.33,20.77-10.45,3.67-6.47,4.29-15.34,3.84-24.62H92.85v5.09Z"/>
      
      <path fill="#222" d="M79.69,102.76h.77A7.69,7.69,0,0,1,85.91,105h0a7.67,7.67,0,0,1,2.26,5.45v10.63a1.77,1.77,0,0,1-1.77,1.77H26.58a1.77,1.77,0,0,1-1.77-1.77V110.48A7.66,7.66,0,0,1,27.07,105h0a7.66,7.66,0,0,1,5.44-2.26H79.69Z"/>
      
      <path fill="#ead79e" d="M70.64,108H35.72a4.22,4.22,0,0,0-3,1.25h0a4.26,4.26,0,0,0-1.25,3v5.28H81.55v-5.28a4.26,4.26,0,0,0-1.26-3,4.31,4.31,0,0,0-3-1.26Z"/>
      
      <path fill="#f8b705" d="M50.71,93h6V75.21c-22.17-7.88-24.26-35-29.55-72.57H22.53V29.41C23,39.6,24.68,47.14,27,52.91a38.19,38.19,0,0,0,8.39,12.8,68.65,68.65,0,0,0,6.71,5.78C49.11,77,54.19,81,50.71,93Z"/>
      
      <path fill="#fac809" d="M56.71,93H63c-3.88-12.71,1.68-17,9-22.55,8.05-6.14,18.5-14.12,18.5-40.35V2.64H27.16C30.58,26.92,32.66,46.81,39.67,60A39.14,39.14,0,0,0,49,71.13a29.3,29.3,0,0,0,5.47,3.17,19.1,19.1,0,0,0,2.21.74v.15l.07,0V93Z"/>
      
      <path fill="#f39d00" d="M58.26,20.13,61.06,27l7.39.56a1.9,1.9,0,0,1,1,3.41l-5.59,4.74,1.76,7.18a1.9,1.9,0,0,1-1.41,2.29,1.88,1.88,0,0,1-1.49-.26L56.5,41l-6.29,3.89a1.9,1.9,0,0,1-2.62-.62,1.85,1.85,0,0,1-.23-1.44l1.75-7.18-5.66-4.8a1.91,1.91,0,0,1,1.09-3.35L51.93,27l2.81-6.84a1.91,1.91,0,0,1,3.52,0Z"/>
      
      <polygon fill="#fff" points="56.5 20.86 59.75 28.78 68.31 29.43 61.76 34.98 63.79 43.3 56.5 38.79 49.21 43.3 51.24 34.98 44.69 29.43 53.24 28.78 56.5 20.86"/>
      
      <path fill="#fff" fill-rule="evenodd" d="M76.62,47.62l-.07.1a3.79,3.79,0,0,0-5.17.83l-.1-.08a3.52,3.52,0,0,0,.62-2.75,3.57,3.57,0,0,0-1.44-2.42,26.79,26.79,0,0,0,2.82.53,3.58,3.58,0,0,0,2.42-1.45l.1.07a3.81,3.81,0,0,0,.82,5.17ZM84.27,34.8l-.07.1a3.78,3.78,0,0,0-5.17.82l-.1-.07a3.79,3.79,0,0,0-.83-5.17l.07-.1a3.8,3.8,0,0,0,5.18-.83l.09.08a3.79,3.79,0,0,0,.83,5.17Zm.06-13.56-.13.18a6.94,6.94,0,0,0-9.46,1.51l-.18-.13a6.5,6.5,0,0,0,1.14-5,6.49,6.49,0,0,0-2.65-4.43l.13-.18a6.94,6.94,0,0,0,9.46-1.51l.18.13a6.5,6.5,0,0,0-1.14,5,6.51,6.51,0,0,0,2.65,4.43Z"/>
    </svg>
  `,


  started: `
                  <svg xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24" style="flex-shrink: 0"
                      width="16"
                      height="16"
                      fill="#e67e22"
                      stroke="#e67e22"
                      stroke-width="2"
                      stroke-linejoin="round"
                      stroke-linecap="round">
                  <path d="M13 3 
                          C12.6 2.5,12 2.5,11.7 3 
                          L5.5 12.2 
                          C5.2 12.7,5.5 13.3,6 13.3 
                          H10 
                          V21 
                          C10 21.5,10.7 21.7,11.1 21.3 
                          L18.2 12.3 
                          C18.6 11.8,18.3 11.2,17.7 11.2 
                          H13 
                          V3 Z"/>
                  </svg> 
  `,

}


function renderQuestActivity(list) {

  const container = document.getElementById("QuestActivityfee");

  if (!list || !list.length) {
    container.innerHTML = `<div class="activity-empty">No activity yet</div>`;
    return;
  }

  container.innerHTML = list.map(item => {

    const icon = MappedQuestSc[item.status] || MappedQuestSc.started;

    return `
      <div class="activity-item">

        <div class="activity-icon ${item.status}">
          ${icon}
        </div>

        <div class="activity-content">
          <div class="activity-text">
            <b>${item.user}</b>
            ${item.status}
            <span class="activity-highlight">${item.quest}</span>
          </div>

          <div class="activity-time">
            ${timeAgo(item.time)}
          </div>
        </div>

      </div>
    `;

  }).join("");

}


function renderTopReviewers(list) {

  const container = document.querySelector("#top-reviewers .reviewer-list");

  if (!list || !list.length) {
    container.innerHTML = `<div class="activity-empty">No reviewers yet</div>`;
    return;
  }

  container.innerHTML = list.map(user => `
    
    <div class="reviewer-row">
      <img src="${user.avatar}" class="reviewer-avatar">

      <div class="reviewer-info">
        <div class="reviewer-name">${user.name}</div>
        <div class="reviewer-meta">
          Reviewed ${user.reviews.toLocaleString()} quests
        </div>
      </div>
    </div>

  `).join("");
}


function renderTopQuests(list) {

  const tbody = document.querySelector("#Topperformingquests tbody");

  if (!list || !list.length) {
    tbody.innerHTML = "<tr><td colspan='5'>No data</td></tr>";
    return;
  }

  tbody.innerHTML = list.map(q => `
    <tr>
      <td>${q.name}</td>
      <td>${q.starts.toLocaleString()}</td>
      <td>${q.completed.toLocaleString()}</td>
      <td>${q.rate}%</td>
      <td><span class="badge ${q.badge}">${q.status}</span></td>
    </tr>
  `).join("");
}


function renderQuestLocations(data){

  const container = document.querySelector(
    "#Quest-Location .location-list"
  );

  if(!data || !data.length){
    container.innerHTML = "<div>No data</div>";
    return;
  }

  container.innerHTML = data.map(row => `
    <div class="location-row">
      <div class="location-name">${row.country}</div>
      <div class="location-bar">
        <div class="location-fill" style="width:${row.percent}%"></div>
      </div>
      <div class="location-percent">${row.percent}%</div>
    </div>
  `).join("");
}


function renderQuestSegments(data){

  if(!data) return;

  const order = ["easy","medium","hard","failed"];

  const circles = document.querySelectorAll(
    "#Questsegmentation .donut circle"
  );

  // first circle = background
  let offset = 0;

  order.forEach((key, i) => {

    const value = data[key] || 0;

    const circle = circles[i + 1];

    circle.setAttribute(
      "stroke-dasharray",
      `${value} ${100 - value}`
    );

    circle.setAttribute(
      "stroke-dashoffset",
      `-${offset}`
    );

    offset += value;

  });

  // legend update
  document.querySelector('[data-seg="easy"]').innerHTML =
    `<span class="dot c1"></span> Easy — ${data.easy}%`;

  document.querySelector('[data-seg="medium"]').innerHTML =
    `<span class="dot c2"></span> Medium — ${data.medium}%`;

  document.querySelector('[data-seg="hard"]').innerHTML =
    `<span class="dot c3"></span> Hard — ${data.hard}%`;


}


async function loadQuestAnalytics(range = "7d") {

  try {

    const res = await fetch(`/api/analytics/quests/${communitySlug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken
      },
      body: JSON.stringify({ range })
    });

    if (!res.ok) {
      console.error("Quest analytics failed:", res.status);
      return;
    }

    const data = await res.json();
    console.log(data.chart);


    /* KPI */
    applyKPI(
      document.querySelector("#panel-quests .kpi-card:nth-child(1) .kpi-value"),
      document.querySelector("#panel-quests .kpi-card:nth-child(1) .kpi-trend"),
      data.started
    );

    applyKPI(
      document.querySelector("#panel-quests .kpi-card:nth-child(2) .kpi-value"),
      document.querySelector("#panel-quests .kpi-card:nth-child(2) .kpi-trend"),
      data.completed
    );

    applyKPI(
      document.querySelector("#panel-quests .kpi-card:nth-child(3) .kpi-value"),
      document.querySelector("#panel-quests .kpi-card:nth-child(3) .kpi-trend"),
      data.completion_rate,
      true
    );

    applyKPI(
      document.querySelector("#panel-quests .kpi-card:nth-child(4) .kpi-value"),
      document.querySelector("#panel-quests .kpi-card:nth-child(4) .kpi-trend"),
      data.avg_time
    );

    /* chart */
    renderAnalyticsChart("quests", range, data.chart);
    renderQuestActivity(data.quest_activity);
    renderTopReviewers(data.top_reviewers);
    renderTopQuests(data.top_performing_quests);
    renderQuestLocations(data.bestquestlocation);
    renderQuestSegments(data.questsegmentation)


  } catch (err) {
    console.error("Quest analytics error:", err);
  }
}


function renderRecentActivity(list = []){
console.log("Recent activity:", list); 
  const container = document.getElementById("recentActivityContainer");


  container.innerHTML = "";

  list.forEach(item => {

    let icon = "";

    icon = SvgInitActivi.message;

    const el = document.createElement("div");
    el.className = "activity-item";

    el.innerHTML = `
      <div class="activity-icon">
        ${icon}
      </div>

      <div class="activity-content">
        <div class="activity-text">
          <b>${item.user}</b>
          sent ${item.count || 1} message${item.count > 1 ? "s" : ""}
          in #${item.channel}
        </div>

        <div class="activity-time">
          ${timeAgo(item.time)}
        </div>
      </div>
    `;

    container.appendChild(el);
  });

}

function renderTopChannels(channels = []) {

  const container = document.getElementById("topChannelsContainer");
  if (!container) return;

  container.innerHTML = "";

  channels.forEach(ch => {

    const el = document.createElement("div");
    el.className = "activity-item";

    el.innerHTML = `
      <div class="activity-content">
        <div class="activity-text">
          #${ch.name} — 
          <span class="activity-highlight">
            ${formatNumber(ch.messages)} msgs
          </span>
        </div>
        <div class="activity-time">${ch.label || ""}</div>
      </div>
    `;

    container.appendChild(el);
  });
}


function renderCategoryDistribution(categories = []) {

  const container = document.getElementById("categoryDistributionContainer");
  if (!container) return;

  container.innerHTML = "";

  categories.forEach(cat => {

    const percent = Math.max(0, Math.min(100, cat.percent || 0));

    const row = document.createElement("div");
    row.className = "location-row";

    row.innerHTML = `
      <div class="location-name">${cat.name}</div>
      <div class="location-bar">
        <div class="location-fill" style="width:${percent}%"></div>
      </div>
      <div class="location-percent">${percent}%</div>
    `;

    container.appendChild(row);
  });
}




function renderTopMembers(members = []) {

  const container = document.getElementById("topMembersContainer");
  if (!container) return;

  container.innerHTML = "";

  members.forEach(user => {

    const avatar = user.avatar || "https://i.pravatar.cc/40";

    const row = document.createElement("div");
    row.className = "reviewer-row";

    row.innerHTML = `
      <img src="${avatar}" class="reviewer-avatar">
      <div class="reviewer-info">
        <div class="reviewer-name">${user.name}</div>
        <div class="reviewer-meta">
          Sent ${formatNumber(user.messages)} messages
        </div>
      </div>
    `;

    container.appendChild(row);
  });
}


function formatNumber(num) {
  return new Intl.NumberFormat().format(num || 0);
}

async function loadChatAnalytics(range = "7d") {

  try {

    const res = await fetch(`/api/analytics/communit/chaty/${communitySlug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken
      },
      body: JSON.stringify({ range })
    });

    if (!res.ok) return;

    const data = await res.json();

    applyKPI(
      document.getElementById("chatTotalMsg"),
      document.querySelector("#panel-chats .kpi-card:nth-child(1) .kpi-trend"),
      data.total_messages
    );

    applyKPI(
      document.getElementById("chatActiveUsers"),
      document.querySelector("#panel-chats .kpi-card:nth-child(2) .kpi-trend"),
      data.active_members
    );

    applyKPI(
      document.getElementById("chatMsgPerMember"),
      document.querySelector("#panel-chats .kpi-card:nth-child(3) .kpi-trend"),
      data.messages_per_member
    );
    applyKPI(
      document.getElementById("chatEngagementRate"),
      document.querySelector("#panel-chats .kpi-card:nth-child(4) .kpi-trend"),
      data.engagement_rate,
      true  
    );

    renderAnalyticsChart("chats", range, data.chart);
    renderTopChannels(data.top_channels);
    renderCategoryDistribution(data.category_distribution);
    renderTopMembers(data.top_members);
    renderRecentActivity(data.recent_activity);
  } catch (err) {
    console.error("Community analytics error:", err);
  }
}



function AnalyticisInit() {

  const SCROLL_MEMORY = {};

  function setupLegendToggle(){

    document.querySelectorAll(".legend-item").forEach(item => {

      item.addEventListener("click", () => {

        const metric =
          item.dataset.metric ||
          item.dataset.qmetric;   // support quest legend too

        if(!metric) return;

        item.classList.toggle("off");

        ChartEngine.toggleMetric(metric);

      });

    });

  }

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {

      tab.addEventListener('click', async () => {

        const container = document.querySelector('.bottom-panels-anal');

        if(container){
          SCROLL_MEMORY[ANALYTICS_STATE.type] = container.scrollTop;
        }

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');

        const newType = tab.dataset.tab;

        document.getElementById('panel-' + newType).classList.add('active');

        ANALYTICS_STATE.type = newType;

        
        /* 🔥 LOAD CORRECT ANALYTICS */
        if (newType === "quests") {
          await loadQuestAnalytics(ANALYTICS_STATE.range);

        } else if (newType === "chats") {
          await loadChatAnalytics(ANALYTICS_STATE.range); 
          // or: await loadCommunity();  ← if you have a separate function

        } else if (newType === "users") {
          await loadCommunityAnalytics(ANALYTICS_STATE.range);
        }

        requestAnimationFrame(() => {

          if(!container) return;

          const saved = SCROLL_MEMORY[newType];
          container.scrollTop = saved ?? 0;

        });

      });

    });


let RANGE_LOADING = false;

document.querySelectorAll('.pill').forEach(pill => {

  pill.addEventListener('click', async () => {

    if (RANGE_LOADING) return;

    document.querySelectorAll('.pill')
      .forEach(p => p.classList.remove('active'));

    pill.classList.add('active');

    const range = pill.dataset.range;

    ANALYTICS_STATE.range = range;
    
    console.log("range of:", range)
    console.log("ANALYTICS_STATE:", ANALYTICS_STATE)
    

    if (ANALYTICS_STATE.type === "users") {

      await loadCommunityAnalytics(range);

    } else if (ANALYTICS_STATE.type === "quests") {

      await loadQuestAnalytics(range);

    } else if (ANALYTICS_STATE.type === "chats") {

      await loadChatAnalytics(range);

    }

  });

});




























































  document.getElementById("backSegments").onclick = () => {

    const card = document.getElementById("segmentsCard");

    card.classList.remove("active");

    document.getElementById("segmentsView").style.display = "flex";
    document.getElementById("segmentsTable").style.display = "none";

  };
  setupLegendToggle();
  loadCommunityAnalytics();

}

const trendupSvg = `
  <svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M244.00244,56.00513V120a12,12,0,0,1-24,0V84.9707l-75.51465,75.51465a11.99973,11.99973,0,0,1-16.9707,0L96.00244,128.9707,32.48779,192.48535a12.0001,12.0001,0,0,1-16.9707-16.9707l72-72a11.99973,11.99973,0,0,1,16.9707,0l31.51465,31.51465L203.03174,68h-35.0293a12,12,0,0,1,0-24h63.99512c.39746-.00024.79541.02075,1.1914.06006.167.01636.32911.04785.49366.071.22314.0315.44629.05786.66748.10181.19238.03809.37793.09131.56689.13843.19092.04761.3833.09009.57276.14721.18505.05616.36377.126.54492.19068.18847.06714.37793.12939.56347.2063.16846.06982.33008.1521.49415.22949.19091.08936.3833.17432.57031.27441.15527.0835.30273.17847.4541.26856.18506.10986.37207.21484.55225.33545.16455.11035.31884.2334.478.35156.15479.11523.31348.22314.46387.34692.28467.23365.55664.4812.81787.73951.019.01879.04.03418.05908.05322s.03467.04.05371.05908c.2583.262.50635.53418.73975.81885.12012.146.22461.2998.33691.45019.12159.16309.24805.32251.36133.49195.11865.177.22168.36084.33008.54272.0918.1543.189.30518.27393.46387.09863.18408.18213.37329.2705.56128.07862.16723.16211.33179.2334.50317.07569.18311.13721.37036.20362.55664.06591.18311.13623.36377.19287.551.05713.18823.09912.37964.14648.56982.04736.18946.10059.37622.13916.56909.04346.22071.07031.44361.10156.666.02344.16553.05518.32788.07129.49536Q244.00171,55.40808,244.00244,56.00513Z"/>
  </svg>
`;

const trenddownSvg = `
<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M233.71191,211.86438c-.17529.025-.34765.05847-.52539.07581-.394.03881-.78906.05981-1.18408.05981h-64a12,12,0,1,1,0-24h35.0293l-67.0293-67.0293-31.51465,31.51465a11.99973,11.99973,0,0,1-16.9707,0l-72-72a12.0001,12.0001,0,0,1,16.9707-16.9707L96.00244,127.0293l31.51465-31.51465a11.99973,11.99973,0,0,1,16.9707,0l75.51465,75.51465V136a12,12,0,0,1,24,0v63.99487q0,.59657-.06006,1.19141c-.01611.16748-.04785.33-.07129.49536-.03125.22241-.0581.44531-.10156.66614-.03857.19275-.0918.37951-.13916.569-.04736.19031-.08935.38147-.14648.56982-.05664.1875-.12744.36841-.19287.552-.06641.18567-.12793.37256-.20362.55542-.07129.17188-.15478.33655-.23388.50415-.08789.18775-.17139.37659-.27.56043-.085.15881-.18213.30957-.27393.464-.1084.18188-.21143.36572-.33008.54272-.11328.16944-.23974.32874-.36133.492-.1123.15027-.21679.3042-.33691.45019-.2334.28467-.48145.55689-.73975.81873-.019.01916-.03466.04016-.05371.0592s-.04.03443-.05908.05322c-.26123.25831-.5332.50586-.81787.73951-.1499.12317-.30762.23071-.46191.34546-.15967.11865-.315.24243-.48047.35327-.17823.11938-.36328.22314-.54639.332-.15332.09131-.30322.18762-.46094.27221-.18408.09864-.37353.18238-.562.27063-.167.07874-.33105.16224-.50244.23328-.18213.07544-.36816.13648-.55322.20239-.18457.06629-.3667.13721-.55567.19446-.18359.05554-.36963.09619-.55468.1427-.19483.04907-.38721.10352-.58545.14282C234.13721,211.80908,233.92432,211.834,233.71191,211.86438Z"/>
</svg>
`;


function applyKPI(valueEl, trendEl, obj, isPercent=false) {

  if (!valueEl || !trendEl || !obj) return;

  valueEl.textContent = isPercent
    ? obj.value + "%"
    : obj.value.toLocaleString();

  const trend = obj.trend;

  trendEl.classList.remove("up", "down");

  // 🚀 No previous data
  if (trend === null || trend === undefined) {
    trendEl.textContent = "New";
    trendEl.classList.add("up");
    return;
  }

  const arrow = trend >= 0 ? trendupSvg : trenddownSvg;
  const cls = trend >= 0 ? "up" : "down";

  trendEl.classList.add(cls);
  trendEl.innerHTML = `${arrow} ${Math.abs(trend)}%`;
}

function renderSegmentsView(data) {

  const view = document.getElementById("segmentsView");
  if (!view) return;

  const seg = data.segments || {};

  const active = seg.active || 0;
  const fresh = seg.new || 0;
  const inactive = seg.inactive || 0;
  const banned = seg.banned || 0;

  const offActive = 0;
  const offNew = -active;
  const offInactive = -(active + fresh);
  const offBanned = -(active + fresh + inactive);

  view.innerHTML = `
    <div class="segments-donut">

      <svg viewBox="0 0 42 42" class="donut">

        <circle cx="21" cy="21" r="15.915"
                fill="transparent"
                stroke="#1f2937"
                stroke-width="6"></circle>

        <circle class="donut-segment" data-seg="active"
                cx="21" cy="21" r="15.915"
                fill="transparent"
                stroke="#60a5fa"
                stroke-width="6"
                stroke-dasharray="${active} ${100-active}"
                stroke-dashoffset="${offActive}"></circle>

        <circle class="donut-segment" data-seg="new"
                cx="21" cy="21" r="15.915"
                fill="transparent"
                stroke="#34d399"
                stroke-width="6"
                stroke-dasharray="${fresh} ${100-fresh}"
                stroke-dashoffset="${offNew}"></circle>

        <circle class="donut-segment" data-seg="inactive"
                cx="21" cy="21" r="15.915"
                fill="transparent"
                stroke="#fbbf24"
                stroke-width="6"
                stroke-dasharray="${inactive} ${100-inactive}"
                stroke-dashoffset="${offInactive}"></circle>

        <circle class="donut-segment" data-seg="banned"
                cx="21" cy="21" r="15.915"
                fill="transparent"
                stroke="#f87171"
                stroke-width="6"
                stroke-dasharray="${banned} ${100-banned}"
                stroke-dashoffset="${offBanned}"></circle>

      </svg>

      <div class="segments-legend">

        <div class="seg-item" data-seg="active">
          <span class="dot active"></span>
          Active Users — ${active}%
        </div>

        <div class="seg-item" data-seg="new">
          <span class="dot new"></span>
          New Users — ${fresh}%
        </div>

        <div class="seg-item" data-seg="inactive">
          <span class="dot inactive"></span>
          Inactive — ${inactive}%
        </div>

        <div class="seg-item" data-seg="banned">
          <span class="dot banned"></span>
          Suspended — ${banned}%
        </div>

      </div>

    </div>
  `;
}





function renderLatestActivity(list){

  const box = document.getElementById("ActivityFeeds");
  box.innerHTML = "";

  if(!list || !list.length){
    box.innerHTML = `<div class="empty">No recent activity</div>`;
    return;
  }

  list.forEach(act => {

    const icon = SvgInitActivi[act.type] || "";

    const html = `
      <div class="activity-item">
        <div class="activity-icon ${act.type}">
          ${icon}
        </div>

        <div class="activity-content">
          <div class="activity-text">
            <b>${act.user}</b> ${act.label}
          </div>
          <div class="activity-time">
            ${timeAgo(act.time)}
          </div>
        </div>
      </div>
    `;

    box.insertAdjacentHTML("beforeend", html);

  });

}





function renderLocations(list){

  const box = document.querySelector(".location-list");
  if(!box) return;

  box.innerHTML = "";

  if(!list || !list.length){
    box.innerHTML = `<div class="empty">No location data</div>`;
    return;
  }

  list.forEach(loc => {

    const html = `
      <div class="location-row">

        <div class="location-name">${loc.name}</div>

        <div class="location-bar">
          <div class="location-fill" style="width:${loc.percent}%"></div>
        </div>

        <div class="location-percent">${loc.percent}%</div>

      </div>
    `;

    box.insertAdjacentHTML("beforeend", html);

  });

}


async function loadCommunityAnalytics(range = "7d") {

  try {

    const res = await fetch(`/api/analytics/community/${communitySlug}`, {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken
      },
      body: JSON.stringify({
        range: range
      })
    });

    if (!res.ok) {
      console.error("Analytics request failed:", res.status);
      return;
    }


    const data = await res.json();
    USERS = [];
    USERS = data.users || [];

    renderSegmentsView(data);

    renderLatestActivity(data.latest_activity);
    renderLocations(data.locations);

    const segItems = document.querySelectorAll(".seg-item");
    const segments = document.querySelectorAll(".donut-segment");

    segItems.forEach(item => {

      const type = item.dataset.seg;

      item.addEventListener("mouseenter", () => {

        segments.forEach(s => {
          if (s.dataset.seg === type) {
            s.classList.add("highlight");
          }
        });

      });

      item.addEventListener("mouseleave", () => {

        segments.forEach(s => s.classList.remove("highlight"));

      });

      item.addEventListener("click", () => {

        showSegmentTable(type);

      });

    });
    renderAnalyticsChart(
      ANALYTICS_STATE.type,
      range,
      data
    );

    applyKPI(
      document.getElementById("kpiTotal"),
      document.getElementById("kpiTotalTrend"),
      data.total
    );

    applyKPI(
      document.getElementById("kpiActive"),
      document.getElementById("kpiActiveTrend"),
      data.active
    );

    applyKPI(
      document.getElementById("kpiNew"),
      document.getElementById("kpiNewTrend"),
      data.new
    );

    applyKPI(
      document.querySelector(".kpi-card:nth-child(4) .kpi-value"),
      document.querySelector(".kpi-card:nth-child(4) .kpi-trend"),
      data.retention,
      true
    );

  } catch (err) {
    console.error("Analytics error:", err);
  }
}

  // Close banner

  window.AnalyticsModule = {
    init: AnalyticisInit
  };


})();




























