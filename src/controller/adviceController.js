import { supabase } from '../config/supabase.js';
import axios from 'axios';

// Enhanced crop requirements database with optimal ranges
const CROP_REQUIREMENTS = {
  maize: {
    name: 'Maize',
    pH: { min: 5.5, max: 7.5, optimal: 6.0 },
    N: { min: 30, optimal: 60, high: 80 },
    P: { min: 20, optimal: 50, high: 70 },
    K: { min: 150, optimal: 200, high: 250 },
    description: 'Tolerates wide pH range but requires high nitrogen'
  },
  beans: {
    name: 'Beans',
    pH: { min: 6.0, max: 7.0, optimal: 6.5 },
    N: { min: 40, optimal: 60, high: 80 },
    P: { min: 25, optimal: 50, high: 70 },
    K: { min: 180, optimal: 220, high: 280 },
    description: 'Prefers neutral pH, moderate nitrogen needs, good for crop rotation'
  },
  peas: {
    name: 'Peas',
    pH: { min: 6.0, max: 7.5, optimal: 6.8 },
    N: { min: 35, optimal: 55, high: 75 },
    P: { min: 20, optimal: 45, high: 65 },
    K: { min: 160, optimal: 200, high: 240 },
    description: 'Slightly acidic to neutral pH, moderate nutrient needs'
  },
  potatoes: {
    name: 'Potatoes',
    pH: { min: 5.5, max: 6.5, optimal: 6.0 },
    N: { min: 45, optimal: 70, high: 90 },
    P: { min: 30, optimal: 60, high: 80 },
    K: { min: 200, optimal: 250, high: 300 },
    description: 'Prefers slightly acidic soil, high potassium needs'
  }
};

// Function to analyze crop suitability with detailed scoring
function analyzeCropSuitability(soil, selectedCrop) {
  const crop = CROP_REQUIREMENTS[selectedCrop.toLowerCase()];
  if (!crop) return { probability: 'Medium', score: 0.5, issues: [], suitability: 'Unknown crop' };
  
  let score = 0;
  const issues = [];
  const recommendations = [];
  let suitability = 'Excellent';
  
  // pH Analysis
  if (soil.pH >= crop.pH.min && soil.pH <= crop.pH.max) {
    score += 0.3;
    if (Math.abs(soil.pH - crop.pH.optimal) <= 0.5) {
      recommendations.push(`✅ pH ${soil.pH.toFixed(1)} is optimal for ${crop.name}`);
    } else {
      recommendations.push(`✅ pH ${soil.pH.toFixed(1)} is suitable for ${crop.name}`);
    }
  } else {
    if (soil.pH < crop.pH.min) {
      issues.push(`pH too acidic (${soil.pH.toFixed(1)}) for ${crop.name}`);
      recommendations.push(`❌ Apply agricultural lime to raise pH from ${soil.pH.toFixed(1)} to ${crop.pH.optimal}`);
    } else {
      issues.push(`pH too alkaline (${soil.pH.toFixed(1)}) for ${crop.name}`);
      recommendations.push(`❌ Consider sulfur or acidic amendments to lower pH`);
    }
  }
  
  // Nitrogen Analysis
  if (soil.N >= crop.N.high) {
    score += 0.25;
    recommendations.push(`✅ Nitrogen (${soil.N.toFixed(1)} mg/kg) is adequate for ${crop.name}`);
  } else if (soil.N >= crop.N.optimal) {
    score += 0.2;
    recommendations.push(`✅ Nitrogen (${soil.N.toFixed(1)} mg/kg) is sufficient for ${crop.name}`);
  } else if (soil.N >= crop.N.min) {
    score += 0.15;
    recommendations.push(`⚠️ Nitrogen (${soil.N.toFixed(1)} mg/kg) is low for ${crop.name}`);
  } else {
    score += 0.05;
    issues.push(`very low nitrogen (${soil.N.toFixed(1)} mg/kg) for ${crop.name}`);
    recommendations.push(`❌ Nitrogen (${soil.N.toFixed(1)} mg/kg) is critically low for ${crop.name}`);
  }
  
  // Phosphorus Analysis
  if (soil.P >= crop.P.high) {
    score += 0.25;
    recommendations.push(`✅ Phosphorus (${soil.P.toFixed(1)} mg/kg) is adequate for ${crop.name}`);
  } else if (soil.P >= crop.P.optimal) {
    score += 0.2;
    recommendations.push(`✅ Phosphorus (${soil.P.toFixed(1)} mg/kg) is sufficient for ${crop.name}`);
  } else if (soil.P >= crop.P.min) {
    score += 0.15;
    recommendations.push(`⚠️ Phosphorus (${soil.P.toFixed(1)} mg/kg) is low for ${crop.name}`);
  } else {
    score += 0.05;
    issues.push(`very low phosphorus (${soil.P.toFixed(1)} mg/kg) for ${crop.name}`);
    recommendations.push(`❌ Phosphorus (${soil.P.toFixed(1)} mg/kg) is critically low for ${crop.name}`);
  }
  
  // Potassium Analysis
  if (soil.K >= crop.K.high) {
    score += 0.2;
    recommendations.push(`✅ Potassium (${soil.K.toFixed(1)} mg/kg) is adequate for ${crop.name}`);
  } else if (soil.K >= crop.K.optimal) {
    score += 0.15;
    recommendations.push(`✅ Potassium (${soil.K.toFixed(1)} mg/kg) is sufficient for ${crop.name}`);
  } else if (soil.K >= crop.K.min) {
    score += 0.1;
    recommendations.push(`⚠️ Potassium (${soil.K.toFixed(1)} mg/kg) is low for ${crop.name}`);
  } else {
    score += 0.05;
    issues.push(`very low potassium (${soil.K.toFixed(1)} mg/kg) for ${crop.name}`);
    recommendations.push(`❌ Potassium (${soil.K.toFixed(1)} mg/kg) is critically low for ${crop.name}`);
  }
  
  // Determine probability and suitability
  if (score >= 0.85) {
    suitability = 'Excellent';
  } else if (score >= 0.7) {
    suitability = 'Good';
  } else if (score >= 0.5) {
    suitability = 'Fair';
  } else {
    suitability = 'Poor';
  }
  
  let probability;
  if (score >= 0.8) probability = 'High';
  else if (score >= 0.6) probability = 'Medium';
  else probability = 'Low';
  
  return { probability, score, issues, recommendations, suitability };
}

// Function to generate intelligent, crop-specific fertilizer recommendations
function generateIntelligentFertilizerRecommendations(soil, selectedCrop, analysis) {
  const crop = CROP_REQUIREMENTS[selectedCrop.toLowerCase()];
  let recommendations = '';
  
  recommendations += `🌱 **${crop.name.toUpperCase()} - Smart Fertilizer Plan**\n\n`;
  
  // pH Management
  if (soil.pH < crop.pH.min) {
    recommendations += `**pH Management:**\n`;
    recommendations += `• Current pH: ${soil.pH.toFixed(1)} (too acidic for ${crop.name})\n`;
    recommendations += `• Target pH: ${crop.pH.optimal} (optimal range: ${crop.pH.min}-${crop.pH.max})\n`;
    recommendations += `• Action: Apply agricultural lime instead of more fertilizers\n`;
    recommendations += `• Lime rate: 2-4 tons/ha depending on soil type\n\n`;
  } else if (soil.pH > crop.pH.max) {
    recommendations += `**pH Management:**\n`;
    recommendations += `• Current pH: ${soil.pH.toFixed(1)} (too alkaline for ${crop.name})\n`;
    recommendations += `• Target pH: ${crop.pH.optimal} (optimal range: ${crop.pH.min}-${crop.pH.max})\n`;
    recommendations += `• Action: Consider sulfur or acidic amendments\n\n`;
  } else {
    recommendations += `**pH Status:** ✅ pH ${soil.pH.toFixed(1)} is suitable for ${crop.name}\n\n`;
  }
  
  // Organic Matter Boost
  recommendations += `**Organic Boost:**\n`;
  if (analysis.score < 0.6) {
    recommendations += `• Apply 4-5 tons/ha cow manure to restore soil structure\n`;
    recommendations += `• OR use 3 tons/ha compost for organic matter\n`;
    recommendations += `• This addresses multiple soil deficiencies at once\n\n`;
  } else if (analysis.score < 0.8) {
    recommendations += `• Apply 2-3 tons/ha cow manure for soil improvement\n`;
    recommendations += `• OR use 1-2 tons/ha compost for maintenance\n\n`;
  } else {
    recommendations += `• Apply 1-2 tons/ha cow manure for soil maintenance\n`;
    recommendations += `• OR use 1 ton/ha compost for organic matter\n\n`;
  }
  
  // Nitrogen Recommendations
  recommendations += `**Nitrogen (N) Management:**\n`;
  if (soil.N < crop.N.min) {
    recommendations += `• Current: ${soil.N.toFixed(1)} mg/kg (critically low)\n`;
    recommendations += `• Target: ${crop.N.optimal} mg/kg\n`;
    recommendations += `• Apply: 100-150 kg/ha Urea split between planting & growth stage\n`;
    recommendations += `• OR use 80-120 kg/ha CAN for better soil health\n\n`;
  } else if (soil.N < crop.N.optimal) {
    recommendations += `• Current: ${soil.N.toFixed(1)} mg/kg (low)\n`;
    recommendations += `• Target: ${crop.N.optimal} mg/kg\n`;
    recommendations += `• Apply: 50-75 kg/ha Urea split between planting & growth stage\n\n`;
  } else {
    recommendations += `• Current: ${soil.N.toFixed(1)} mg/kg (adequate)\n`;
    recommendations += `• Action: Reduce nitrogen application to prevent over-fertilization\n`;
    recommendations += `• Apply: 25-30 kg/ha Urea only at planting if needed\n\n`;
  }
  
  // Phosphorus Recommendations
  recommendations += `**Phosphorus (P) Management:**\n`;
  if (soil.P < crop.P.min) {
    recommendations += `• Current: ${soil.P.toFixed(1)} mg/kg (critically low)\n`;
    recommendations += `• Target: ${crop.P.optimal} mg/kg\n`;
    recommendations += `• Apply: 100-150 kg/ha DAP at planting\n`;
    recommendations += `• OR use 80-120 kg/ha TSP for better phosphorus availability\n\n`;
  } else if (soil.P < crop.P.optimal) {
    recommendations += `• Current: ${soil.P.toFixed(1)} mg/kg (low)\n`;
    recommendations += `• Target: ${crop.P.optimal} mg/kg\n`;
    recommendations += `• Apply: 50-75 kg/ha DAP at planting\n\n`;
  } else {
    recommendations += `• Current: ${soil.P.toFixed(1)} mg/kg (adequate)\n`;
    recommendations += `• Action: Skip DAP to prevent nutrient lock and over-fertilization\n`;
    recommendations += `• Focus on organic matter instead\n\n`;
  }
  
  // Potassium Recommendations
  recommendations += `**Potassium (K) Management:**\n`;
  if (soil.K < crop.K.min) {
    recommendations += `• Current: ${soil.K.toFixed(1)} mg/kg (critically low)\n`;
    recommendations += `• Target: ${crop.K.optimal} mg/kg\n`;
    recommendations += `• Apply: 100-150 kg/ha MOP at planting\n`;
    recommendations += `• OR use 80-120 kg/ha SOP for better soil health\n\n`;
  } else if (soil.K < crop.K.optimal) {
    recommendations += `• Current: ${soil.K.toFixed(1)} mg/kg (low)\n`;
    recommendations += `• Target: ${crop.K.optimal} mg/kg\n`;
    recommendations += `• Apply: 50-75 kg/ha MOP at planting\n\n`;
  } else {
    recommendations += `• Current: ${soil.K.toFixed(1)} mg/kg (adequate)\n`;
    recommendations += `• Action: Reduce potassium application\n`;
    recommendations += `• Apply: 25-30 kg/ha MOP only if needed\n\n`;
  }
  
  // Avoid Over-Fertilization Warning
  if (analysis.score >= 0.7) {
    recommendations += `**⚠️ Important:**\n`;
    recommendations += `• Your soil already shows adequate nutrient levels\n`;
    recommendations += `• Avoid over-fertilization to prevent nutrient lock\n`;
    recommendations += `• Focus on organic matter and soil structure\n`;
    recommendations += `• Monitor crop response and adjust accordingly\n\n`;
  }
  
  return recommendations;
}

// Function to generate area-specific biodiversity advice with crop rotation
function generateIntelligentBiodiversityAdvice(neighborhood, soil, selectedCrop, analysis) {
  const crop = CROP_REQUIREMENTS[selectedCrop.toLowerCase()];
  let advice = `🌿 **Soil Biodiversity & Land Restoration for ${neighborhood}**\n\n`;
  
  // Area-specific analysis
  if (analysis.score < 0.5) {
    advice += `**Current Status:** Your area shows significant soil degradation\n`;
    advice += `**Primary Issues:** Low organic matter, nutrient deficiencies, poor soil structure\n\n`;
    
    advice += `**Immediate Actions to Combat Desertification:**\n`;
    advice += `• Implement intensive organic matter addition (4-5 tons/ha manure + compost)\n`;
    advice += `• Plant cover crops (especially legumes) to prevent soil erosion\n`;
    advice += `• Use mulching to retain soil moisture and reduce evaporation\n`;
    advice += `• Establish windbreaks with native grasses and trees\n\n`;
    
  } else if (analysis.score < 0.7) {
    advice += `**Current Status:** Your area has moderate soil health issues\n`;
    advice += `**Primary Issues:** Some nutrient deficiencies, moderate organic matter\n\n`;
    
    advice += `**Soil Restoration Actions:**\n`;
    advice += `• Regular organic matter addition (2-3 tons/ha manure + compost)\n`;
    advice += `• Implement crop rotation with legumes (beans, peas) to fix nitrogen\n`;
    advice += `• Use green manure crops between main crop seasons\n`;
    advice += `• Practice reduced tillage to preserve soil life\n\n`;
    
  } else {
    advice += `**Current Status:** Your area has good soil health\n`;
    advice += `**Primary Issues:** Minor improvements needed, maintain current practices\n\n`;
    
    advice += `**Maintenance Actions:**\n`;
    advice += `• Continue organic farming practices (1-2 tons/ha manure + compost)\n`;
    advice += `• Maintain crop diversity and rotation\n`;
    advice += `• Practice sustainable water management\n`;
    advice += `• Monitor soil health regularly\n\n`;
  }
  
  // Crop-specific biodiversity advice
  advice += `**Crop-Specific Biodiversity Enhancement:**\n`;
  if (crop) {
    if (selectedCrop.toLowerCase() === 'beans' || selectedCrop.toLowerCase() === 'peas') {
      advice += `• ✅ ${crop.name} are excellent for soil biodiversity (nitrogen-fixing legumes)\n`;
      advice += `• Plant as part of rotation: ${crop.name} → Maize → Potatoes → ${crop.name}\n`;
      advice += `• After harvest, leave roots in soil to decompose naturally\n`;
    } else {
      advice += `• Consider intercropping ${crop.name} with legumes (beans, peas)\n`;
      advice += `• This provides nitrogen naturally and improves soil structure\n`;
      advice += `• Plant legumes between rows or as border crops\n`;
    }
  }
  
  // Long-term restoration strategy
  advice += `\n**Long-term Restoration Strategy:**\n`;
  advice += `• Year 1-2: Focus on organic matter and soil structure\n`;
  advice += `• Year 3-4: Implement crop rotation and cover cropping\n`;
  advice += `• Year 5+: Establish perennial crops and agroforestry systems\n`;
  advice += `• Monitor soil organic matter, pH, and nutrient levels annually\n`;
  advice += `• Adapt practices based on soil test results and crop performance\n`;
  
  return advice;
}

// Function to get neighborhood name using OpenStreetMap API
async function getNeighborhoodName(lat, lon) {
  try {
    console.log(`Getting location for coordinates: ${lat}, ${lon}`);
    
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=16&accept-language=en`);
    const data = await response.json();
    
    console.log('OpenStreetMap full response:', JSON.stringify(data, null, 2)); // Detailed debug log
    
    // Extract neighborhood/suburb name with comprehensive fallback logic
    if (data.address) {
      console.log('Address object found:', data.address);
      
      // Try multiple possible neighborhood fields
      const neighborhood = data.address.suburb || 
                         data.address.neighbourhood || 
                         data.address.city_district || 
                         data.address.district || 
                         data.address.quarter ||
                         data.address.area;
      
      const city = data.address.city || 
                   data.address.town || 
                   data.address.municipality || 
                   data.address.county;
      
      const county = data.address.county || 
                     data.address.state || 
                     data.address.province;
      
      console.log('Extracted fields:', { neighborhood, city, county });
      
      // Build location string with priority logic
      if (neighborhood && city && neighborhood !== city) {
        return `${neighborhood}, ${city}`;
      } else if (neighborhood) {
        return `${neighborhood}, ${city || county || 'Nairobi'}`;
      } else if (city) {
        return city;
      } else if (county) {
        return county;
      }
    }
    
    // If no address object, try to parse display_name
    if (data.display_name) {
      console.log('Using display_name:', data.display_name);
      const parts = data.display_name.split(', ');
      console.log('Display name parts:', parts);
      
      // Look for neighborhood-like names (usually 2nd or 3rd part)
      if (parts.length >= 3) {
        // Skip parts that are too generic
        const skipWords = ['County', 'Kenya', 'Africa', 'Province', 'State', 'Region'];
        
        for (let i = 1; i < Math.min(4, parts.length); i++) {
          const part = parts[i].trim();
          if (part && !skipWords.some(word => part.includes(word)) && part.length > 2) {
            return `${part}, ${parts[0]}`;
          }
        }
      }
      
      // If no good neighborhood found, return the city
      if (parts.length >= 2) {
        return parts[0];
      }
      
      return parts[0] || 'Unknown area';
    }
    
    // Final fallback - use coordinates to estimate area
    console.log('No location data found, using coordinate-based fallback');
    if (lat >= -1.5 && lat <= -1.0 && lon >= 36.7 && lon <= 37.0) {
      return 'Nairobi Metropolitan Area';
    } else if (lat >= -1.0 && lat <= -0.5 && lon >= 36.7 && lon <= 37.0) {
      return 'Central Kenya';
    } else if (lat >= -1.5 && lat <= -1.0 && lon >= 37.0 && lon <= 37.5) {
      return 'Eastern Kenya';
    } else {
      return 'Kenya';
    }
    
  } catch (error) {
    console.error('Error getting neighborhood:', error);
    
    // Fallback based on coordinates if API fails
    if (lat >= -1.5 && lat <= -1.0 && lon >= 36.7 && lon <= 37.0) {
      return 'Nairobi Metropolitan Area';
    } else if (lat >= -1.0 && lat <= -0.5 && lon >= 36.7 && lon <= 37.0) {
      return 'Central Kenya';
    } else if (lat >= -1.5 && lat <= -1.0 && lon >= 37.0 && lon <= 37.5) {
      return 'Eastern Kenya';
    } else {
      return 'Kenya';
    }
  }
}

// Function to find nearby soil samples within 5km radius
async function findNearbySoilSamples(lat, lon, radiusKm = 5) {
  try {
    const { data: samples, error } = await supabase
      .from('geosoildata')
      .select('*');
    
    if (error) throw error;
    
    // Filter samples within radius using Haversine formula
    const nearbySamples = samples.filter(sample => {
      if (!sample.latitude || !sample.longitude) return false;
      
      const distance = calculateDistance(lat, lon, sample.latitude, sample.longitude);
      return distance <= radiusKm;
    });
    
    return nearbySamples;
  } catch (error) {
    console.error('Error finding nearby samples:', error);
    return [];
  }
}

// Haversine formula to calculate distance between coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const getAdvice = async (req, res) => {
  try {
    const { lat, lon, crop: selectedCrop, userId } = req.body;
    
    if (!lat || !lon || !selectedCrop) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get neighborhood name using OpenStreetMap
    const neighborhood = await getNeighborhoodName(lat, lon);
    
    // Find nearby soil samples within 5km
    const nearbySamples = await findNearbySoilSamples(lat, lon, 5);
    
    // Use nearby samples if available, otherwise fallback to county-level data
    let soil;
    if (nearbySamples.length > 0) {
      // Calculate weighted average based on distance
      const totalWeight = nearbySamples.reduce((sum, sample) => {
        const distance = calculateDistance(lat, lon, sample.latitude, sample.longitude);
        return sum + (1 / (distance + 0.1)); // Add 0.1 to avoid division by zero
      }, 0);
      
      soil = {
        pH: nearbySamples.reduce((sum, sample) => sum + (sample.pH * (1 / (calculateDistance(lat, lon, sample.latitude, sample.longitude) + 0.1))), 0) / totalWeight,
        N: nearbySamples.reduce((sum, sample) => sum + (sample.N * (1 / (calculateDistance(lat, lon, sample.latitude, sample.longitude) + 0.1))), 0) / totalWeight,
        P: nearbySamples.reduce((sum, sample) => sum + (sample.P * (1 / (calculateDistance(lat, lon, sample.latitude, sample.longitude) + 0.1))), 0) / totalWeight,
        K: nearbySamples.reduce((sum, sample) => sum + (sample.K * (1 / (calculateDistance(lat, lon, sample.latitude, sample.longitude) + 0.1))), 0) / totalWeight,
        Region: neighborhood
      };
    } else {
      // Fallback to county-level data (existing logic)
      const { data: soilData, error: soilError } = await supabase
        .from('geosoildata')
        .select('*')
        .limit(1);
      
      if (soilError) throw soilError;
      soil = soilData[0];
    }

    // Ensure all soil values are valid numbers, replace any "N/A" or invalid values with 0
    const cleanSoil = {
      pH: Number(soil.pH) || 0,
      N: Number(soil.N) || 0,
      P: Number(soil.P) || 0,
      K: Number(soil.K) || 0,
      Region: soil.Region || neighborhood
    };

    // Analyze crop suitability and calculate success probability
    const analysis = analyzeCropSuitability(cleanSoil, selectedCrop);
    
    // Generate intelligent fertilizer recommendations
    const fertilizerRecommendations = generateIntelligentFertilizerRecommendations(cleanSoil, selectedCrop, analysis);
    
    // Generate area-specific biodiversity advice
    const biodiversityAdvice = generateIntelligentBiodiversityAdvice(neighborhood, cleanSoil, selectedCrop, analysis);
    
    // Build comprehensive soil recommendation
    let soilRecommendation = `Soil Analysis for ${neighborhood}:\n\n` +
      `Your selected crop: ${selectedCrop}\n` +
      `Success Probability: ${analysis.probability}\n\n` +
      `Current Soil Profile:\n` +
      `• pH: ${cleanSoil.pH.toFixed(1)} (${cleanSoil.pH < 5.5 ? 'Very acidic' : cleanSoil.pH < 6.5 ? 'Acidic' : cleanSoil.pH < 7.5 ? 'Neutral' : 'Alkaline'})\n` +
      `• Nitrogen (N): ${cleanSoil.N.toFixed(1)} mg/kg\n` +
      `• Phosphorus (P): ${cleanSoil.P.toFixed(1)} mg/kg\n` +
      `• Potassium (K): ${cleanSoil.K.toFixed(1)} mg/kg\n\n` +
      `Recommendations:\n${fertilizerRecommendations}`;

    const recommendations = {
      crop: selectedCrop,
      soil: soilRecommendation,
      weather: 'Weather conditions are favorable for your selected crop',
      biodiversity: biodiversityAdvice
    };

    console.log('Generated recommendations:', recommendations); // Debug log
    console.log('Soil recommendation length:', soilRecommendation.length); // Debug log

    // Save to database with cleaned soil values
    const { error: insertError } = await supabase
      .from('advice')
      .insert({
        userid: userId,
        crop: selectedCrop,
        county: neighborhood,
        latitude: lat,
        longitude: lon,
        soildata_ph: cleanSoil.pH,
        soildata_n: cleanSoil.N,
        soildata_p: cleanSoil.P,
        soildata_k: cleanSoil.K,
        createdat: new Date().toISOString()
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
    }

    // Get user history
    const { data: historyData, error: historyError } = await supabase
      .from('advice')
      .select('*')
      .eq('userid', userId)
      .order('createdat', { ascending: false })
      .limit(5);

    const history = historyError ? [] : historyData;

    const adviceData = {
      county: neighborhood,
      latitude: lat,
      longitude: lon,
      soilData: {
        ph: cleanSoil.pH,
        nitrogen: cleanSoil.N,
        phosphorus: cleanSoil.P,
        potassium: cleanSoil.K,
      },
      recommendations,
      totalRain: '0',
      weatherData: {},
      history: history
    };

    res.json(adviceData);
  } catch (error) {
    console.error('Error in getAdvice:', error);
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