import React, { useState, useMemo, useRef } from "react";
import { Complaint } from "../types";
import { Filter, MapPin, Eye, Info, HelpCircle, Sparkles } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";

interface MapProps {
  complaints: Complaint[];
  selectedIssueId: string | null;
  onSelectIssue: (id: string) => void;
  userLat?: number;
  userLng?: number;
  interactiveMode?: boolean;
  onCoordinatesSelect?: (lat: number, lng: number, address: string) => void;
  darkMode?: boolean;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

export default function MapVisualization({
  complaints,
  selectedIssueId,
  onSelectIssue,
  userLat,
  userLng,
  interactiveMode = false,
  onCoordinatesSelect,
  darkMode = true
}: MapProps) {
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterSeverity, setFilterSeverity] = useState<string>("All");
  const [mapMode, setMapMode] = useState<"standard" | "heatmap">("standard");
  const [mapEngine, setMapEngine] = useState<"google" | "vector">(hasValidKey ? "google" : "vector");
  const [mapZoom, setMapZoom] = useState<number>(14);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Center coordinates (simulated neighborhood center or user's live coordinates)
  const baseLat = userLat || 12.9716;
  const baseLng = userLng || 77.5946;

  // Transform coordinates to local SVG viewBox points for vector map fallback
  // Map ranges: Lat: 12.95 to 12.99, Lng: 77.57 to 77.62
  const getCoordinatesPos = (lat: number, lng: number) => {
    const latMin = 12.9500;
    const latMax = 12.9900;
    const lngMin = 77.5700;
    const lngMax = 77.6200;

    // Convert to percentage coordinates inside 1000x600 grid
    const x = ((lng - lngMin) / (lngMax - lngMin)) * 1000;
    const y = (1 - (lat - latMin) / (latMax - latMin)) * 600; // SVG y-axis is downwards
    return { x, y };
  };

  const isDark = darkMode;
  const mapBg = isDark ? "#080808" : "#f1f5f9";
  const mapGrid = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.04)";
  const districtFill = isDark ? "#0f0f0f" : "#ffffff";
  const districtStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.1)";
  const lakeFill = isDark ? "#1d3557" : "#0284c7";
  const lakeOpacity = isDark ? "0.4" : "0.3";
  const lakeTextColor = isDark ? "#60a5fa" : "#025a87";
  const parkFill = isDark ? "#132a13" : "#22c55e";
  const parkOpacity = isDark ? "0.4" : "0.15";
  const parkTextColor = isDark ? "#52b788" : "#15803d";
  const majorRoadStroke = isDark ? "#34495e" : "#cbd5e1";
  const majorRoadCenterStroke = isDark ? "#f1c40f" : "#e2e8f0";
  const majorRoadTextColor = isDark ? "#bdc3c7" : "#475569";
  const subAvenueStroke = isDark ? "#2c3e50" : "#e2e8f0";

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchCategory = filterCategory === "All" || c.category === filterCategory;
      const matchSeverity = filterSeverity === "All" || c.severity === filterSeverity;
      return matchCategory && matchSeverity;
    });
  }, [complaints, filterCategory, filterSeverity]);

  // Handle Google Map click to drop a new reporter pin
  const handleGoogleMapClick = (e: any) => {
    if (!interactiveMode || !onCoordinatesSelect) return;
    const latLng = e.detail?.latLng || e.latLng;
    if (latLng) {
      const lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
      const lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;

      // Mock an address based on coordinates clicked
      const subLocalities = ["Koromangala Main St", "Indiranagar 80 Feet Rd", "MG Road Layout", "Jayanagar 4th Block", "HSR Sector 2"];
      const chosenLocality = subLocalities[Math.floor((lat + lng) * 100) % subLocalities.length];
      const mockAddress = `No. ${Math.floor(lat * 1000) % 150}, ${chosenLocality}, Civic District`;

      onCoordinatesSelect(Number(lat.toFixed(6)), Number(lng.toFixed(6)), mockAddress);
    }
  };

  // Handle Vector fallback map click to drop a new reporter pin
  const handleVectorMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactiveMode || !onCoordinatesSelect || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const svgWidth = rect.width;
    const svgHeight = rect.height;

    const xPercent = clickX / svgWidth;
    const yPercent = clickY / svgHeight;

    const latMin = 12.9500;
    const latMax = 12.9900;
    const lngMin = 77.5700;
    const lngMax = 77.6200;

    const lng = lngMin + xPercent * (lngMax - lngMin);
    const lat = latMax - yPercent * (latMax - latMin);

    const subLocalities = ["Koromangala Main St", "Indiranagar 80 Feet Rd", "MG Road Layout", "Jayanagar 4th Block", "HSR Sector 2"];
    const chosenLocality = subLocalities[Math.floor((lat + lng) * 100) % subLocalities.length];
    const mockAddress = `No. ${Math.floor(lat * 1000) % 150}, ${chosenLocality}, Civic District`;

    onCoordinatesSelect(Number(lat.toFixed(6)), Number(lng.toFixed(6)), mockAddress);
  };

  // Categories list
  const categories = ["All", "Pothole & Road Damage", "Garbage & Waste Accumulation", "Water Leakage & Drainage", "Streetlight & Electrical", "Public Safety & Vandalism"];

  const handleShowSetupInstructions = () => {
    alert(
      "To add your API key:\n\n" +
      "1. Get an API key:\n" +
      "   https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais\n\n" +
      "2. Open Settings (⚙️ gear icon, top-right corner) → Secrets\n" +
      "3. Type GOOGLE_MAPS_PLATFORM_KEY as the secret name, press Enter\n" +
      "4. Paste your API key as the value, press Enter\n\n" +
      "The app rebuilds automatically after you add the secret."
    );
  };

  return (
    <div className="card shadow-sm border-0 mb-4 overflow-hidden" id="map-visualization-card">
      <div className="card-header bg-dark text-white d-flex flex-wrap align-items-center justify-content-between p-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <MapPin className="text-warning animate-bounce" size={20} />
          <h5 className="mb-0 fw-semibold">
            {mapEngine === "google" ? "Live Google Maps Street View" : "Hyperlocal Civic Map & Heat Overlay"}
          </h5>
        </div>
        <div className="d-flex gap-2">
          {hasValidKey && (
            <button
              onClick={() => setMapEngine(mapEngine === "google" ? "vector" : "google")}
              className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1 fw-bold"
              id="btn-toggle-engine"
            >
              <Sparkles size={13} />
              <span>{mapEngine === "google" ? "Use Vector Simulation" : "Use Real Google Map"}</span>
            </button>
          )}
          <button
            onClick={() => setMapMode("standard")}
            className={`btn btn-sm ${mapMode === "standard" ? "btn-light" : "btn-outline-light"}`}
            id="btn-map-standard"
          >
            Standard Pin Map
          </button>
          <button
            onClick={() => setMapMode("heatmap")}
            className={`btn btn-sm ${mapMode === "heatmap" ? "btn-light" : "btn-outline-light"}`}
            id="btn-map-heatmap"
          >
            Density Heat Map
          </button>
        </div>
      </div>

      {/* Upgrade Callout when Google Maps API Key is missing */}
      {!hasValidKey && (
        <div className="bg-primary bg-opacity-10 text-primary border-bottom p-3 d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2 small">
            <Sparkles size={16} className="text-primary flex-shrink-0 animate-bounce" />
            <div>
              <strong>Connect Live Google Maps Engine!</strong> A high-fidelity interactive map integration is available. Add your Google Maps API key to transition from vector grids to live satellite and street rendering.
            </div>
          </div>
          <button
            type="button"
            onClick={handleShowSetupInstructions}
            className="btn btn-primary btn-xs py-1 px-2.5 font-bold rounded text-nowrap"
            id="btn-maps-setup-guide"
          >
            How to Connect
          </button>
        </div>
      )}

      <div className="bg-light p-3 border-bottom d-flex flex-wrap gap-3 align-items-center justify-content-between">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="text-muted d-flex align-items-center gap-1 small fw-medium">
            <Filter size={14} /> Filter Map:
          </span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="form-select form-select-sm"
            style={{ maxWidth: "220px" }}
            id="map-filter-category"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="form-select form-select-sm"
            style={{ maxWidth: "130px" }}
            id="map-filter-severity"
          >
            <option value="All">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        <div className="small text-muted fw-medium d-none d-md-block">
          {filteredComplaints.length} issue(s) mapped in district
        </div>
      </div>

      <div className={`position-relative ${darkMode ? "bg-[#050505]" : "bg-light"}`} style={{ height: "450px" }} ref={mapContainerRef}>
        {mapEngine === "google" && hasValidKey ? (
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={{ lat: baseLat, lng: baseLng }}
              defaultZoom={mapZoom}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              style={{ width: "100%", height: "100%" }}
              onClick={handleGoogleMapClick}
              gestureHandling={"greedy"}
            >
              {filteredComplaints.map(complaint => {
                const color = complaint.severity === "Critical" ? "#dc3545" : 
                              complaint.severity === "High" ? "#fd7e14" : 
                              complaint.severity === "Medium" ? "#ffc107" : "#0d6efd";
                const isSelected = selectedIssueId === complaint.id;

                // For Heatmap mode on Google Maps, we render concentric styled markers mimicking density hotspots
                if (mapMode === "heatmap") {
                  return (
                    <React.Fragment key={`g-heat-${complaint.id}`}>
                      <AdvancedMarker
                        position={{ lat: complaint.gpsLocation.lat, lng: complaint.gpsLocation.lng }}
                        onClick={() => onSelectIssue(complaint.id)}
                      >
                        <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: "60px", height: "60px" }}>
                          <div className="position-absolute rounded-circle animate-pulse" style={{ width: "100%", height: "100%", backgroundColor: color, opacity: darkMode ? 0.15 : 0.35 }}></div>
                          <div className="position-absolute rounded-circle" style={{ width: "50%", height: "50%", backgroundColor: color, opacity: darkMode ? 0.3 : 0.65 }}></div>
                          <div className="rounded-circle border border-white shadow-sm" style={{ width: "12px", height: "12px", backgroundColor: color }}></div>
                        </div>
                      </AdvancedMarker>
                    </React.Fragment>
                  );
                }

                return (
                  <AdvancedMarker
                    key={`g-pin-${complaint.id}`}
                    position={{ lat: complaint.gpsLocation.lat, lng: complaint.gpsLocation.lng }}
                    onClick={() => onSelectIssue(complaint.id)}
                    title={complaint.title}
                  >
                    <Pin
                      background={color}
                      borderColor={isSelected ? "#ffffff" : "rgba(0,0,0,0.4)"}
                      glyphColor="#fff"
                      scale={isSelected ? 1.3 : 1.0}
                    />
                  </AdvancedMarker>
                );
              })}

              {/* Interactive Target Spot in Interactive Mode */}
              {interactiveMode && userLat && userLng && (
                <AdvancedMarker position={{ lat: userLat, lng: userLng }}>
                  <Pin background="#20c997" borderColor="#ffffff" glyphColor="#fff" scale={1.2} />
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* Render Vector Interactive Map */
          <svg
            onClick={handleVectorMapClick}
            viewBox="0 0 1000 600"
            className="w-full h-100"
            style={{ cursor: interactiveMode ? "crosshair" : "default", backgroundColor: mapBg }}
            id="vector-map-svg"
          >
            {/* Base GRID Patterns for background streets */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={mapGrid} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="1000" height="600" fill={mapBg} />
            <rect width="1000" height="600" fill="url(#grid)" />

            {/* District Outline and Parks (Simulated Map Layout) */}
            <path d="M 100 100 C 300 80, 450 150, 700 100 C 900 150, 950 400, 850 500 C 700 550, 400 450, 200 520 C 50 450, 10 200, 100 100 Z" fill={districtFill} stroke={districtStroke} strokeWidth="2" />
            
            {/* Lake/Water Body */}
            <path d="M 750 350 C 800 370, 820 450, 780 470 C 730 450, 710 380, 750 350 Z" fill={lakeFill} opacity={lakeOpacity} />
            <text x="760" y="420" fill={lakeTextColor} fontSize="12" fontWeight="bold" opacity="0.8">District Lake</text>

            {/* Central Park */}
            <rect x="250" y="220" width="160" height="100" rx="15" fill={parkFill} opacity={parkOpacity} />
            <text x="290" y="275" fill={parkTextColor} fontSize="12" fontWeight="bold" opacity="0.8">Central Park</text>

            {/* Major Roads */}
            <line x1="100" y1="300" x2="900" y2="300" stroke={majorRoadStroke} strokeWidth="24" opacity="0.8" />
            <line x1="100" y1="300" x2="900" y2="300" stroke={majorRoadCenterStroke} strokeWidth="2" strokeDasharray="5,5" opacity="0.7" />
            <text x="120" y="294" fill={majorRoadTextColor} fontSize="10" opacity="0.9">80 FEET MAIN ROAD</text>

            <line x1="500" y1="50" x2="500" y2="550" stroke={majorRoadStroke} strokeWidth="18" opacity="0.8" />
            <line x1="500" y1="50" x2="500" y2="550" stroke={majorRoadCenterStroke} strokeWidth="1" strokeDasharray="5,5" opacity="0.7" />
            <text x="508" y="90" fill={majorRoadTextColor} fontSize="10" opacity="0.9" transform="rotate(90, 508, 90)">OUTER RING ROAD</text>

            {/* Sub avenues */}
            <line x1="200" y1="120" x2="800" y2="500" stroke={subAvenueStroke} strokeWidth="8" opacity="0.5" />
            <line x1="850" y1="150" x2="150" y2="450" stroke={subAvenueStroke} strokeWidth="8" opacity="0.5" />

            {/* HEAT MAP OVERLAYS */}
            {mapMode === "heatmap" && filteredComplaints.map(complaint => {
              const { x, y } = getCoordinatesPos(complaint.gpsLocation.lat, complaint.gpsLocation.lng);
              const size = complaint.severity === "Critical" ? 90 : complaint.severity === "High" ? 70 : complaint.severity === "Medium" ? 50 : 30;
              const color = complaint.severity === "Critical" ? "#dc3545" : complaint.severity === "High" ? "#fd7e14" : complaint.severity === "Medium" ? "#ffc107" : "#0d6efd";
              return (
                <g key={`heat-${complaint.id}`}>
                  <circle cx={x} cy={y} r={size} fill={color} opacity={isDark ? "0.15" : "0.35"} />
                  <circle cx={x} cy={y} r={size / 2} fill={color} opacity={isDark ? "0.25" : "0.55"} />
                  <circle cx={x} cy={y} r="8" fill={color} />
                </g>
              );
            })}

            {/* STANDARD PIN MARKERS */}
            {mapMode === "standard" && filteredComplaints.map(complaint => {
              const { x, y } = getCoordinatesPos(complaint.gpsLocation.lat, complaint.gpsLocation.lng);
              const color = complaint.severity === "Critical" ? "#dc3545" : 
                            complaint.severity === "High" ? "#fd7e14" : 
                            complaint.severity === "Medium" ? "#ffc107" : "#0d6efd";
              const isSelected = selectedIssueId === complaint.id;

              return (
                <g
                  key={`pin-${complaint.id}`}
                  transform={`translate(${x}, ${y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectIssue(complaint.id);
                  }}
                  style={{ cursor: "pointer" }}
                  id={`marker-${complaint.id}`}
                >
                  {/* Ping animation for high severity */}
                  {(complaint.severity === "Critical" || complaint.severity === "High") && (
                    <circle r={isSelected ? "25" : "18"} fill={color} opacity="0.4" className="animate-ping" style={{ animationDuration: "1.8s" }} />
                  )}
                  
                  {/* Marker Outer Base */}
                  <path
                    d="M0 -15 C-8 -15, -10 -7, 0 5 C10 -7, 8 -15, 0 -15 Z"
                    fill={color}
                    stroke={isSelected ? "#ffffff" : "rgba(0,0,0,0.4)"}
                    strokeWidth={isSelected ? 3 : 1}
                    transform="scale(1.3)"
                  />
                  
                  {/* Inner White dot */}
                  <circle cy="-13" r="4.5" fill="#ffffff" />
                  
                  {/* Text identifier badge (only on hover or selected) */}
                  {isSelected && (
                    <g transform="translate(0, -42)" id={`pop-${complaint.id}`}>
                      <rect x="-85" y="-12" width="170" height="28" rx="6" fill="#1e293b" stroke="#ffffff" strokeWidth="1" />
                      <text x="0" y="6" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                        {complaint.title.length > 25 ? `${complaint.title.substring(0, 22)}...` : complaint.title}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Interactive User selection pointer */}
            {interactiveMode && userLat && userLng && (
              <g transform={`translate(${getCoordinatesPos(userLat, userLng).x}, ${getCoordinatesPos(userLat, userLng).y})`}>
                <circle r="30" fill="#20c997" opacity="0.2" className="animate-pulse" />
                <circle r="10" fill="#20c997" stroke="#ffffff" strokeWidth="2" />
                <path d="M0 -22 L-6 -10 L6 -10 Z" fill="#20c997" stroke="#ffffff" strokeWidth="1" />
                <text y="-28" textAnchor="middle" fill="#20c997" fontSize="10" fontWeight="bold" stroke="#000000" strokeWidth="0.5">
                  Target Spot
                </text>
              </g>
            )}

            {/* Non-interactive user live location beacon */}
            {!interactiveMode && userLat && userLng && (
              <g transform={`translate(${getCoordinatesPos(userLat, userLng).x}, ${getCoordinatesPos(userLat, userLng).y})`}>
                <circle r="22" fill="#0d6efd" opacity="0.35" className="animate-pulse" style={{ animationDuration: "2s" }} />
                <circle r="7" fill="#0d6efd" stroke="#ffffff" strokeWidth="2" />
                <text y="18" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="extrabold" stroke="#000000" strokeWidth="0.8">
                  📍 You Are Here
                </text>
              </g>
            )}
          </svg>
        )}

        {/* Map Instructions Helper Box */}
        <div className="position-absolute bottom-0 start-0 m-3 p-2 bg-dark bg-opacity-75 text-white rounded shadow-sm d-flex align-items-center gap-2 small" style={{ pointerEvents: "none" }}>
          <Info size={16} className="text-info" />
          <div>
            {interactiveMode ? (
              <span>Click anywhere on the map to **Auto-Detect GPS coordinates** for your report.</span>
            ) : (
              <span>Click on any colored marker pin to inspect details on the dashboard below.</span>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card-footer bg-white p-3 border-top">
        <div className="row text-center g-2 justify-content-center">
          <div className="col-6 col-sm-3 d-flex align-items-center justify-content-center gap-2">
            <span className="badge rounded-circle p-2 bg-danger" style={{ width: "12px", height: "12px" }}></span>
            <span className="small text-muted fw-semibold">Critical Threat</span>
          </div>
          <div className="col-6 col-sm-3 d-flex align-items-center justify-content-center gap-2">
            <span className="badge rounded-circle p-2 bg-warning" style={{ width: "12px", height: "12px" }}></span>
            <span className="small text-muted fw-semibold">High Severity</span>
          </div>
          <div className="col-6 col-sm-3 d-flex align-items-center justify-content-center gap-2">
            <span className="badge rounded-circle p-2 bg-info" style={{ width: "12px", height: "12px" }}></span>
            <span className="small text-muted fw-semibold">Medium Repair</span>
          </div>
          <div className="col-6 col-sm-3 d-flex align-items-center justify-content-center gap-2">
            <span className="badge rounded-circle p-2 bg-primary" style={{ width: "12px", height: "12px" }}></span>
            <span className="small text-muted fw-semibold">Low Repair</span>
          </div>
        </div>
      </div>
    </div>
  );
}
