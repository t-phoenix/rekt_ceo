import { useState, useEffect } from 'react';
import { Badge } from '../components/badge';
import './styles/pienomics.css';

// Main $CEO Token Distribution
const ceoTokenData = [
  {
    name: "Dev Wallet",
    percentage: 2,
    color: "token-burn",
    icon: "🔥",
    description: "Tokens for our launching wallet",
    funFact: "Dev Wallet Tokens are locked away!"
  },
  {
    name: "Team + Advisory",
    percentage: 2,
    color: "token-team", 
    icon: "👨‍💻",
    description: "Operating team will hold these tokens as founding $CEO holders",
    funFact: "These tokens will be bought on the bonding curve!"
  },
  {
    name: "Bonding Curve",
    percentage: 90,
    color: "token-liquidity",
    icon: "💧",
    description: "All tokens will be bought on the bonding curve",
    funFact: "Transparent, fair price discovery without insider advantage!"
  },
  {
    name: "Campaigns",
    percentage: 4,
    color: "token-marketing",
    icon: "💕",
    description: "Rewards for the bootstaping the community post launch",
    funFact: "Makes rainbows of awareness!"
  },
  {
    name: "Liquidity Pool2",
    percentage: 2,
    color: "token-community",
    icon: "✨",
    description: "Team launches 2nd pool to increase PAIR support before graduating.",
    funFact: "$CEO holders can become LP and earn passive income!"
  }
];

// Treasury USDC Holdings
const treasuryUSDCData = [
  {
    name: "Reward & Ecosystem Incentives ",
    percentage: 20,
    color: "token-community",
    icon: "⚙️",
    description: "Drive token utility and reward free cult labour",
    funFact: "Keeps the engines running smoothly!"
  },
  {
    name: "Team",
    percentage: 30,
    color: "token-team",
    icon: "🤝",
    description: "Team will earn once the Phase 1 is succesfull with this piece of pie",
    funFact: "Building a community is hard work!"
  },
  
  {
    name: "New Ventures",
    percentage: 8,
    color: "token-burn",
    icon: "🛠️",
    description: "Incubating community Ideas",
    funFact: "Where innovation is born, the pool will be increased in future!"
  },
  {
    name: "Liquidity Pool/ Dex",
    percentage: 30,
    color: "token-liquidity",
    icon: "🌴",
    description: "Critical for maintaining market stability",
    funFact: "Liquidity Rebalancing!"
  },
  
  {
    name: "Partnerships & Collab",
    percentage: 8,
    color: "token-marketing",
    icon: "💎",
    description: "Essential for ecosystem growth and marketing",
    funFact: "Strateguc partnerships are always welcome to connect!"
  },
  {
    name: "Development Fund",
    percentage: 4,
    color: "token-burn",
    icon: "🏗️",
    description: "Future Products and innovations",
    funFact: "We'll build an easy to use DAO tool for everyone (NON TECHNICAL)!"
  },
];

// Treasury $CEO Holdings
const treasuryCEOData = [
  {
    name: "Rewards & ecosystem Incentives",
    percentage: 50,
    color: "token-community",
    icon: "🎯",
    description: "Drive token utility and reward free cult labour",
    funFact: "Keeps the engines running smoothly!"
  },
  {
    name: "New Ventures",
    percentage: 10,
    color: "token-marketing",
    icon: "🌱",
    description: "Incubating community Ideas",
    funFact: "Where innovation is born, the pool will be increased in future!"
  },
  {
    name: "Development Fund",
    percentage: 6,
    color: "token-team",
    icon: "🏛️",
    description: "Future Products and innovations",
    funFact: "We'll build an easy to use DAO tool for everyone (NON TECHNICAL)!"
  },
  {
    name: "Partnerships & Collab",
    percentage: 4,
    color: "token-burn",
    icon: "⚽️",
    description: "Essential for ecosystem growth and marketing",
    funFact: "Strateguc partnerships are always welcome to connect!"
  },
  {
    name: "Liquidity Pool/ Dex Reserve",
    percentage: 20,
    color: "token-marketing",
    icon: "💰",
    description: "Critical for maintaining market stability",
    funFact: "Liquidity Rebalancing!"
  },
  {
    name: "Team",
    percentage: 10,
    color: "token-team",
    icon: "⛳️",
    description: "Team will earn once the Phase 1 is succesfull with this piece of pie",
    funFact: "Building a community is hard work!"
  }
];

const chartConfigs = [
  {
    title: "$CEO Token",
    subtitle: "Main Token Distribution",
    totalValue: "21M $CEO",
    data: ceoTokenData,
    size: 'large',
    floatDelay: 0
  },
  {
    title: "Treasury USDC",
    subtitle: "Stablecoin Holdings",
    totalValue: "50% of total treasury value",
    data: treasuryUSDCData,
    size: 'medium',
    floatDelay: 1
  },
  {
    title: "Treasury $CEO",
    subtitle: "Token Holdings",
    totalValue: "50% of total treasury value",
    data: treasuryCEOData,
    size: 'medium',
    floatDelay: 2
  }
];

const FallingToken = ({ delay }) => (
  <div 
    className="pienomics-falling-token"
    style={{
      left: `${Math.random() * 100}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${3 + Math.random() * 2}s`
    }}
  >
    💰
  </div>
);



const Star = ({ delay }) => (
  <div 
    className="pienomics-star"
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${delay}s`,
      fontSize: `${8 + Math.random() * 8}px`
    }}
  >
    ✨
  </div>
);

const InteractivePieChart = ({ 
  config, 
  selectedChart, 
  selectedSlice, 
  onChartSelect, 
  onSliceSelect, 
  chartIndex 
}) => {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const isActive = selectedChart === chartIndex;
  const chartSize = config.size === 'large' ? 300 : 200;
  const radius = config.size === 'large' ? 100 : 70;

  const createPieSlice = (data, index, startAngle, endAngle) => {
    const isHovered = hoveredSlice === index;
    const isSelected = selectedSlice === index && isActive;
    const angle = endAngle - startAngle;
    const midAngle = startAngle + angle / 2;
    
    const innerRadius = isHovered ? 15 : 8;
    const outerRadius = isHovered ? radius + 10 : radius;
    
    const x1 = Math.cos(startAngle) * innerRadius;
    const y1 = Math.sin(startAngle) * innerRadius;
    const x2 = Math.cos(startAngle) * outerRadius;
    const y2 = Math.sin(startAngle) * outerRadius;
    const x3 = Math.cos(endAngle) * outerRadius;
    const y3 = Math.sin(endAngle) * outerRadius;
    const x4 = Math.cos(endAngle) * innerRadius;
    const y4 = Math.sin(endAngle) * innerRadius;
    
    const largeArc = angle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3}`,
      `L ${x4} ${y4}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}`,
      'Z'
    ].join(' ');

    const labelRadius = radius + 10;
    const labelX = Math.cos(midAngle) * labelRadius;
    const labelY = Math.sin(midAngle) * labelRadius;

    return (
      <g key={index}>
        <path
          d={pathData}
          className={`pienomics-slice ${data.color}`}
          style={{
            filter: isHovered ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' : 'none',
            opacity: isActive || selectedChart === null ? 1 : 0.6
          }}
          onMouseEnter={() => setHoveredSlice(index)}
          onMouseLeave={() => setHoveredSlice(null)}
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling to SVG
            // First ensure the chart is selected
            if (selectedChart !== chartIndex) {
              onChartSelect(chartIndex);
            }
            // Then select the slice
            onSliceSelect(index);
          }}
        />
        {/* Background circle for better visibility */}
        
        <text
          x={labelX}
          y={labelY}
          className="pienomics-slice-label"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <tspan x={labelX} dy="-0.4em">{data.icon}</tspan>
          <tspan x={labelX} dy="1.4em">{data.percentage}%</tspan>
        </text>
        {(isHovered || isSelected) && (
          <circle
            cx={Math.cos(midAngle) * (radius - 15)}
            cy={Math.sin(midAngle) * (radius - 15)}
            r="0"
            className="pienomics-star"
          />
        )}
      </g>
    );
  };

  let currentAngle = -Math.PI / 2;

  return (
    <div 
      className={`pienomics-chart ${config.size} ${isActive ? 'active' : ''}`}
      style={{ 
        animationDelay: `${config.floatDelay}s`
      }}
    >
      <div 
        className="pienomics-chart-header"
        onClick={() => onChartSelect(chartIndex)}
        style={{ cursor: 'pointer' }}
      >
        <div className="chart-header-icon">
          {config.title === "$CEO Token" && "💎"}
          {config.title === "Treasury USDC" && "🏦"}
          {config.title === "Treasury $CEO" && "🎯"}
        </div>
        <div className="chart-header-content">
          <h3 className="pienomics-chart-title">{config.title}</h3>
          <div className="chart-header-details">
            <span className="chart-subtitle">{config.subtitle}</span>
            <span className="chart-value">{config.totalValue}</span>
          </div>
        </div>
        <div className="chart-header-glow"></div>
      </div>
      
      <svg
        width={chartSize}
        height={chartSize}
        viewBox={`-${chartSize/2} -${chartSize/2} ${chartSize} ${chartSize}`}
        className="pienomics-svg"
        onClick={(e) => {
          // Only trigger if clicking on the SVG background, not on slices
          if (e.target === e.currentTarget) {
            onChartSelect(chartIndex);
          }
        }}
      >
        {config.data.map((data, index) => {
          const angle = (data.percentage / 100) * 2 * Math.PI;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;
          
          return createPieSlice(data, index, startAngle, endAngle);
        })}
        
        <circle
          cx="0"
          cy="0"
          r="6"
          className="pienomics-star"
        />
      </svg>
    </div>
  );
};

export const Pienomics = () => {
  const [selectedChart, setSelectedChart] = useState(null);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [fallingTokens, setFallingTokens] = useState([]);
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Create falling tokens periodically
    const tokenInterval = setInterval(() => {
      setFallingTokens(prev => [...prev, Date.now()]);
      setTimeout(() => {
        setFallingTokens(prev => prev.slice(1));
      }, 4000);
    }, 1200);

    // Create twinkling stars
    const starInterval = setInterval(() => {
      setStars(prev => [...prev, Date.now()]);
      setTimeout(() => {
        setStars(prev => prev.slice(1));
      }, 3000);
    }, 500);

    return () => {
      clearInterval(tokenInterval);
      clearInterval(starInterval);
    };
  }, []);

  const handleChartSelect = (chartIndex) => {
    if (selectedChart === chartIndex) {
      // If clicking the same chart, deselect it
      setSelectedChart(null);
      setSelectedSlice(null);
    } else {
      // If clicking a different chart, select it but keep slice selection if it's valid
      setSelectedChart(chartIndex);
      // Only reset slice if the current slice doesn't exist in the new chart
      if (selectedSlice !== null && selectedSlice >= chartConfigs[chartIndex].data.length) {
        setSelectedSlice(null);
      }
    }
  };

  const handleSliceSelect = (sliceIndex) => {
    if (selectedSlice === sliceIndex) {
      // If clicking the same slice, deselect it
      setSelectedSlice(null);
    } else {
      // If clicking a different slice, select it
      setSelectedSlice(sliceIndex);
    }
  };

  const activeData = selectedChart !== null ? chartConfigs[selectedChart].data[selectedSlice || 0] : null;

  return (
    <div id="pienomics" className="pienomics-section">
      {/* Background elements */}

      {/* Falling tokens */}
      {fallingTokens.map((token, index) => (
        <FallingToken key={token} delay={index * 0.3} />
      ))}

      {/* Twinkling stars */}
      {stars.map((star, index) => (
        <Star key={star} delay={index * 0.1} />
      ))}

      <div className="pienomics-container">
        <div className="pienomics-header">
          <h1 className="section-title">
            Rektonomics
          </h1>
          <p className="pienomics-subtitle">
            <b>So many charts, because we're serious of making a community. <br /> Token Contract Address:</b> 0xrektceoaddresscomingsoon
          </p>
        </div>

        {/* Three Interactive Pie Charts */}
        <div className="pienomics-charts-container">
          {chartConfigs.map((config, index) => (
            <InteractivePieChart
              key={index}
              config={config}
              selectedChart={selectedChart}
              selectedSlice={selectedSlice}
              onChartSelect={handleChartSelect}
              onSliceSelect={handleSliceSelect}
              chartIndex={index}
            />
          ))}
        </div>

        {/* Information Panel */}
        <div className="pienomics-info-panel">
          {selectedChart !== null && selectedSlice !== null && activeData ? (
            <div className="pienomics-info-card">
              <div className="pienomics-info-header">
                <div className="pienomics-info-left">
                  <div className="pienomics-info-icon">{activeData.icon}</div>
                </div>
                <div className="pienomics-info-right">
                  <h3 className="pienomics-info-title">
                    {activeData.name}
                  </h3>
                  <Badge variant="outline" style={{ marginBottom: '0.75rem' }}>
                    {chartConfigs[selectedChart].title}
                  </Badge>
                  <div className="pienomics-info-percentage">
                    {activeData.percentage}%
                  </div>
                  <p className="pienomics-info-description">
                    {activeData.description}
                  </p>
                  <div className="pienomics-info-funfact">
                    💡 {activeData.funFact}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedChart !== null ? (
            <div className="pienomics-info-card">
              <div className="pienomics-info-header">
                <div className="pienomics-info-left">
                  <div className="pienomics-info-icon">{(chartConfigs[selectedChart].title === "$CEO Token" && "💎") || (chartConfigs[selectedChart].title === "Treasury USDC" && "🏦") || (chartConfigs[selectedChart].title === "Treasury $CEO" && "🎯")}</div>
                </div>
                <div className="pienomics-info-right">
                  <h3 className="pienomics-info-title">
                    {chartConfigs[selectedChart].title}
                  </h3>
                  <div className="pienomics-info-percentage">
                    {chartConfigs[selectedChart].totalValue}
                  </div>
                  <Badge variant="secondary" style={{ marginBottom: '0.75rem' }}>
                    {chartConfigs[selectedChart].subtitle}
                  </Badge>
                  <p className="pienomics-info-description">
                    Click on a slice to explore this treasure pool in detail.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="pienomics-info-card">
              <div className="pienomics-info-header">
                <div className="pienomics-info-left">
                  <div className="pienomics-info-icon">🌟</div>
                </div>
                <div className="pienomics-info-right">
                  <h3 className="pienomics-info-title">
                    Choose Your Constellation
                  </h3>
                  <p className="pienomics-info-description">
                    Click on any floating chart to begin your journey through our tokenomics universe.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
