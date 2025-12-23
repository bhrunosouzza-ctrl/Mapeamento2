
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CaseRecord } from '../types';

interface CaseMapProps {
  cases: CaseRecord[];
}

const CaseMap: React.FC<CaseMapProps> = ({ cases }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([-19.585, -42.635], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }

    if (markersRef.current) {
      markersRef.current.clearLayers();
      
      cases.forEach((c) => {
        const isDengueOnly = c.suspeita.toLowerCase() === 'dengue';
        const color = isDengueOnly ? '#ef4444' : '#f59e0b'; // Red for Dengue, Amber for Mixed
        
        const marker = L.circleMarker(c.coords, {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).bindPopup(`
          <div class="font-sans">
            <h3 class="font-bold text-lg border-b pb-1 mb-1">${c.nome}</h3>
            <p><strong>Bairro:</strong> ${c.bairro}</p>
            <p><strong>Endereço:</strong> ${c.logradouro}, ${c.numero}</p>
            <p><strong>Sintomas em:</strong> ${c.dataSintomas.toLocaleDateString()}</p>
            <p class="mt-1 px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">${c.suspeita}</p>
          </div>
        `);
        markersRef.current?.addLayer(marker);
      });

      if (cases.length > 0) {
        const group = new L.FeatureGroup(markersRef.current.getLayers() as L.Layer[]);
        mapRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [cases]);

  return <div ref={mapContainerRef} className="h-full w-full shadow-inner bg-slate-200" />;
};

export default CaseMap;
