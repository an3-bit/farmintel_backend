import { supabase } from '../config/supabase.js';
import axios from 'axios';

// Remove mock dataset and KNN

export const getAdvice = async (req, res) => {
  try {
    // Log the incoming request body for debugging
    console.log('Incoming request body:', req.body);

    const { lat, lon, crop, userId } = req.body;

    // Validate input
    if (
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      !crop ||
      !userId
    ) {
      return res.status(400).json({
        message: 'lat, lon (numbers), crop, and userId are required in the request body',
        received: req.body
      });
    }

    // Fetch soil data from Supabase by coordinates (example: nearest match)
    const { data: soilRows, error: soilError } = await supabase
      .from('geosoildata') // changed from 'soil_data' to 'geosoildata'
      .select('*')
      .order('id', { ascending: true }); // adjust as needed

    if (soilError) throw soilError;
    if (!soilRows || soilRows.length === 0) {
      return res.status(404).json({ error: 'No soil data found in Supabase.' });
    }

    // For demo: just use the first row (replace with nearest neighbor logic if needed)
    const soil = soilRows[0];

    // Determine county (mocked for Nairobi or dataset regions)
    const county = lat > -1.5 && lat < -1.0 && lon > 36.5 && lon < 37.0 ? 'Nairobi' : lat > 0 ? 'Kakamega' : 'Siaya';

    // Detailed, user-friendly soil recommendation
    const ph = soil.pH ?? 0;
    const n = soil.N ?? 0;
    const n_kg_ha = soil.N_kg_ha ?? 0;
    const n_target = soil.N_kg_ha_target_at_least ?? 60;
    const n_fert = soil.N_kg_ha_fertilizer_application ?? 0;
    const p = soil.P ?? 0;
    const p_kg_ha = soil.P_kg_ha ?? 0;
    const p_target = soil.P_kg_ha_target_at_least ?? 50;
    const p_fert = soil.P_kg_ha_fertilizer_application ?? 0;
    const k = soil.K ?? 0;
    const k_kg_ha = soil.K_kg_ha ?? 0;
    const k_target = soil.K_kg_ha_target_at_least ?? 30;
    const k_fert = soil.K_kg_ha_fertilizer_application ?? 0;
    const ec = soil.EC_us_cm ?? 0;
    const temp = soil.Temp_deg_cel ?? 0;
    const humidity = soil.Humidity_percent ?? 0;

    // Use the selected crop in the recommendation
    const selectedCrop = crop || 'maize';
    // Use the detected county as the region if available, otherwise fall back to soil.Region
    const detectedRegion = county || soil.Region || 'your region';

    // Soil summary section with refined language
    const soilSummary = `Soil Summary for your region (${detectedRegion}):\n\n` +
      `• pH: ${ph} (${ph < 5.5 ? 'very acidic' : ph < 6.5 ? 'slightly acidic' : ph < 7.5 ? 'neutral' : 'alkaline'})\n` +
      `• Nitrogen (N): ${n} ppm (~${n_kg_ha} kg/ha, target ≥${n_target} kg/ha)\n` +
      `• Phosphorus (P): ${p} ppm (~${p_kg_ha} kg/ha, target ≥${p_target} kg/ha)\n` +
      `• Potassium (K): ${k} ppm (~${k_kg_ha} kg/ha, target ≥${k_target} kg/ha)\n` +
      `• EC: ${ec} µS/cm (${ec < 200 ? 'non-saline' : 'saline'})\n` +
      `• Temperature: ${temp} °C\n` +
      `• Humidity: ${humidity}%\n`;

    // Crop-specific logic
    let cropAdvice = '';
    if (selectedCrop.toLowerCase() === 'maize') {
      cropAdvice += `\n🌽 Maize Recommendation\n`;
      cropAdvice += ph < 5.5 ? `Maize prefers pH 5.5–7.0. Apply lime to raise pH.` : ph < 7.5 ? `pH is suitable for maize.` : `High pH may reduce micronutrient availability.`;
      cropAdvice += `\nNitrogen is essential for leaf growth. Apply Urea or CAN as recommended.`;
      cropAdvice += `\nPhosphorus boosts root development. Use DAP or TSP at planting.`;
      cropAdvice += `\nPotassium improves grain filling. Use MOP if K is low.`;
    } else if (selectedCrop.toLowerCase() === 'beans') {
      cropAdvice += `\n🫘 Beans Recommendation\n`;
      cropAdvice += ph < 6.0 ? `Beans prefer pH 6.0–7.0. Apply lime if pH is below 6.` : ph < 7.5 ? `pH is suitable for beans.` : `High pH may reduce micronutrient uptake.`;
      cropAdvice += `\nBeans fix their own nitrogen but need phosphorus for nodulation. Use TSP or DAP at planting.`;
      cropAdvice += `\nPotassium helps disease resistance. Apply MOP if K is low.`;
    } else if (selectedCrop.toLowerCase() === 'potatoes') {
      cropAdvice += `\n🥔 Potatoes Recommendation\n`;
      cropAdvice += ph < 5.0 ? `Potatoes tolerate acidic soils but pH < 5.0 may cause scab. Apply lime if needed.` : ph < 6.5 ? `pH is suitable for potatoes.` : `High pH may increase disease risk.`;
      cropAdvice += `\nNitrogen is needed for tuber growth. Apply in split doses.`;
      cropAdvice += `\nPhosphorus is critical for root and tuber development. Use DAP or TSP at planting.`;
      cropAdvice += `\nPotassium is vital for tuber bulking and quality. Use MOP if K is low.`;
    } else if (selectedCrop.toLowerCase() === 'peas') {
      cropAdvice += `\n🌱 Peas Recommendation\n`;
      cropAdvice += ph < 6.0 ? `Peas prefer pH 6.0–7.5. Apply lime if pH is below 6.` : ph < 7.5 ? `pH is suitable for peas.` : `High pH may reduce micronutrient uptake.`;
      cropAdvice += `\nPeas fix nitrogen but need phosphorus for nodulation. Use TSP or DAP at planting.`;
      cropAdvice += `\nPotassium helps pod filling. Apply MOP if K is low.`;
    } else {
      cropAdvice += `\n🌾 General Recommendation\n`;
      cropAdvice += `Adjust pH, N, P, and K as per the above summary for optimal ${selectedCrop} growth.`;
    }

    // pH Management section
    let phSection = `\n✅ Recommendation for ${selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1)}\n`;
    phSection += cropAdvice;
    phSection += `\n\nOther Soil & Climate Considerations\n`;
    phSection += `• EC (${ec} µS/cm): ${ec < 200 ? 'Safe; no salinity risk.' : 'High salinity, consider leaching or organic matter addition.'}\n`;
    phSection += `• Temperature (${temp} °C) & Humidity (${humidity}%): Suitable for ${selectedCrop}. Ensure adequate soil moisture through mulching, irrigation, or timely planting with expected rains.\n`;

    // Biodiversity & anti-desertification advice
    let biodiversityAdvice = `🌿 Soil Biodiversity & Land Restoration\n`;
    biodiversityAdvice += `• Maintain ground cover with cover crops or mulching to protect soil and provide habitat for beneficial organisms.\n`;
    biodiversityAdvice += `• Incorporate organic matter (compost, manure, crop residues) to feed soil microbes and improve structure.\n`;
    biodiversityAdvice += `• Practice reduced tillage or no-till to preserve soil life and prevent erosion.\n`;
    biodiversityAdvice += `• Rotate crops and include legumes to diversify root systems and support soil fauna.\n`;
    biodiversityAdvice += `• Prevent overgrazing and manage water runoff to reduce risk of desertification.\n`;
    biodiversityAdvice += `• In arid or erosion-prone areas, establish windbreaks or plant native grasses to stabilize soil.\n`;
    biodiversityAdvice += `• Monitor soil health regularly and adapt practices to maintain a living, resilient soil.\n`;

    const recommendations = {
      crop: selectedCrop,
      soil: `${soilSummary}${phSection}`,
      weather: 'Expect moderate rainfall this week',
      biodiversity: biodiversityAdvice,
      alternativeCrops: [],
    };

    // Fetch weather data (unchanged)
    const weatherApiKey = process.env.OPENWEATHER_API_KEY || '5d918c233b784255aab124619251608';
    const weatherData = {};
    if (weatherApiKey) {
      const cities = [
        { name: 'Kakamega', lat: 0.2827, lon: 34.7519 },
        { name: 'Siaya', lat: 0.0636, lon: 34.2874 },
        { name: 'Nairobi', lat: -1.2833, lon: 36.8167 },
      ];
      for (const city of cities) {
        try {
          const response = await axios.get(
            `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${city.lat},${city.lon}`
          );
          weatherData[city.name.toLowerCase()] = {
            temperature: `${response.data.current.temp_c}°C`,
            rainfall: response.data.current.precip_mm !== undefined ? `${response.data.current.precip_mm} mm` : '0 mm',
            humidity: `${response.data.current.humidity}%`,
            forecast: response.data.current.condition.text,
          };
        } catch (error) {
          weatherData[city.name.toLowerCase()] = {
            temperature: 'N/A',
            rainfall: 'N/A',
            humidity: 'N/A',
            forecast: 'Weather data unavailable',
          };
        }
      }
    }

    // Log user access history (in-memory for demo; replace with DB in production)
    if (!global.userAccessHistory) global.userAccessHistory = {};
    if (!global.userAccessHistory[userId]) global.userAccessHistory[userId] = [];
    global.userAccessHistory[userId].push({
      accessedAt: new Date().toISOString(),
      county,
      crop: selectedCrop,
    });
    // Only keep the last 10 accesses for brevity
    const userHistory = global.userAccessHistory[userId].slice(-10);

    const adviceData = {
      county,
      latitude: lat,
      longitude: lon,
      soilData: {
        ph: soil.pH ?? 0,
        nitrogen: soil.N ?? 0,
        phosphorus: soil.P ?? 0,
        potassium: soil.K ?? 0,
      },
      recommendations,
      totalRain: weatherData[county.toLowerCase()]?.rainfall?.split(' ')[0] || '0',
      weatherData,
      history: userHistory, // Add access history to the response
    };

    // Log soil and insert object for debugging
    console.log("Soil object:", soil);
    const insertObj = {
      userid: userId || 'default_user',
          county,
          latitude: lat,
          longitude: lon,
      soildata_ph: soil.pH ?? 0,
      soildata_n: soil.N ?? 0,
      soildata_p: soil.P ?? 0,
      soildata_k: soil.K ?? 0,
          recommendations_crop: recommendations.crop,
          recommendations_soil: recommendations.soil,
          recommendations_weather: recommendations.weather,
      totalrain: adviceData.totalRain,
      weatherdata_kakamega: weatherData.kakamega,
      weatherdata_siaya: weatherData.siaya,
      weatherdata_nairobi: weatherData.nairobi,
    };
    console.log("Insert object:", insertObj);
    // Save advice to Supabase
    const { error: insertError } = await supabase
      .from('advice')
      .insert([insertObj]);
    if (insertError) throw insertError;

    res.status(200).json(adviceData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { data: history, error } = await supabase
      .from('advice') // replace with your actual advice table name
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// getAgriAdvice can remain as is or be updated later