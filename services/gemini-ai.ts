import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import type { LocationInfo } from '../types/location-database';
import { googlePlaces } from './google-places';
import { locationDatabase } from './location-database';

// Initialize Gemini AI (key read at request time so Expo env reload works)
function getGeminiApiKey(): string {
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
}

function createGenerativeModel() {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 4096,
      candidateCount: 1,
      stopSequences: [],
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });
}

export interface TripPlanRequest {
  currentLocation: {
    city: string;
    state: string;
    latitude?: number;
    longitude?: number;
  };
  destination: {
    city: string;
    state?: string;
  };
  constraints?: {
    fuelRange?: number; // miles of fuel left
    budget?: 'low' | 'medium' | 'high';
    travelStyle?: 'fast' | 'scenic' | 'budget';
    interests?: string[]; // e.g., ["food", "nature", "museums"]
  };
  tripHistory?: {
    favoriteTypes?: string[];
    pastDestinations?: string[];
  };
}

export interface TripPlanResponse {
  summary: string;
  urgentStops?: {
    type: 'gas' | 'food' | 'rest';
    suggestions: Array<{
      name: string;
      distance: string;
      reason: string;
    }>;
  }[];
  itinerary: {
    day: number;
    activities: Array<{
      time: string;
      activity: string;
      location: string;
      reason: string;
    }>;
  }[];
  recommendations: {
    restaurants: string[];
    attractions: string[];
    tips: string[];
  };
  estimatedCosts?: {
    gas: string;
    food: string;
    activities: string;
    total: string;
  };
}

export class GeminiService {
  private conversationHistory: {role: string, content: string, timestamp: number}[] = [];
  private userPreferences: Record<string, any> = {};
  private tripPatterns: Record<string, any> = {};
  private memorizationEnabled: boolean = false; // Default: OFF for privacy

  private getModel() {
    return createGenerativeModel();
  }

  private extractResponseText(response: { text: () => string }): string {
    try {
      return response.text();
    } catch (error) {
      console.warn('[Gemini] Response blocked or empty:', error);
      return '';
    }
  }

  constructor() {
    // Model is created per request via getModel() so API key/env changes apply after restart
  }

  /**
   * Generate a trip plan based on user request
   */
  async generateTripPlan(request: TripPlanRequest): Promise<string> {
    let prompt = await this.buildTripPlanPrompt(request);
    
    // Sanitize the prompt string
    prompt = this.sanitizePrompt(prompt);
    
    // Limit prompt size to prevent serialization errors
    const MAX_PROMPT_LENGTH = 30000;
    const truncatedPrompt = prompt.length > MAX_PROMPT_LENGTH 
      ? prompt.substring(0, MAX_PROMPT_LENGTH) + '\n\n[...prompt truncated for length...]'
      : prompt;
    
    // Final sanitization
    const safePrompt = this.sanitizePrompt(truncatedPrompt);
    
    try {
      const result = await this.getModel().generateContent(safePrompt);
      const response = await result.response;
      return this.extractResponseText(response) || this.getFallbackResponse(request);
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Check for serialization errors
      if (error?.message?.includes('Serialization') || 
          error?.message?.includes('serialization') ||
          error?.message?.includes('StreamUnifiedChatRequest')) {
        console.error('Serialization error in generateTripPlan - prompt may be too large or contain non-serializable data');
      }
      
      return this.getFallbackResponse(request);
    }
  }

  /**
   * Stream trip plan responses for real-time display
   */
  async *streamTripPlan(request: TripPlanRequest): AsyncGenerator<string> {
    let prompt = await this.buildTripPlanPrompt(request);
    
    // Sanitize the prompt string
    prompt = this.sanitizePrompt(prompt);
    
    // Limit prompt size to prevent serialization errors
    const MAX_PROMPT_LENGTH = 30000;
    const truncatedPrompt = prompt.length > MAX_PROMPT_LENGTH 
      ? prompt.substring(0, MAX_PROMPT_LENGTH) + '\n\n[...prompt truncated for length...]'
      : prompt;
    
    // Final sanitization
    const safePrompt = this.sanitizePrompt(truncatedPrompt);
    
    try {
      // Use non-streaming for React Native compatibility
      const result = await this.getModel().generateContent(safePrompt);
      const response = await result.response;
      const fullText = this.extractResponseText(response);
      
      // Limit response length to prevent infinite loops
      const maxLength = 2000;
      const truncatedText = fullText.length > maxLength ? fullText.substring(0, maxLength) + '...' : fullText;
      
      // Simulate streaming by yielding chunks of the response
      const words = truncatedText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = words.slice(0, i + 1).join(' ');
        yield chunk + (i < words.length - 1 ? ' ' : '');
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error('Gemini streaming error:', error);
      
      // Check for serialization errors
      if (error?.message?.includes('Serialization') || 
          error?.message?.includes('serialization') ||
          error?.message?.includes('StreamUnifiedChatRequest')) {
        console.error('Serialization error in streamTripPlan - prompt may be too large or contain non-serializable data');
      }
      
      // Provide a realistic fallback response for testing
      yield this.getDemoResponse(request);
    }
  }

  private async quickChat(message: string, context?: any): Promise<string> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return '🧭 **Pathfinder Setup Required** 🧭\n\nAdd `EXPO_PUBLIC_GEMINI_API_KEY` to your `.env` file and restart the dev server (`npm run start`).';
    }

    const contextLines: string[] = [];
    if (context?.timeOfDay) contextLines.push(`Time of day: ${context.timeOfDay}`);
    if (context?.season) contextLines.push(`Season: ${context.season}`);
    if (context?.currentLocation) contextLines.push(`User location: ${context.currentLocation}`);
    if (context?.foodAndInterests) contextLines.push(`User likes: ${context.foodAndInterests}`);
    const contextBlock = contextLines.length > 0 ? `\nContext: ${contextLines.join('. ')}` : '';

    const historyLines: string[] = [];
    const recentHistory = context?.conversationHistory as { role: string; content: string }[] | undefined;
    if (recentHistory?.length) {
      for (const turn of recentHistory.slice(-8)) {
        const label = turn.role === 'user' ? 'User' : 'Assistant';
        historyLines.push(`${label}: ${turn.content}`);
      }
    }
    const historyBlock = historyLines.length > 0
      ? `\nRecent conversation (oldest first):\n${historyLines.join('\n')}\n`
      : '';

    const prompt = this.sanitizePrompt(
      `You are Pathfinder, the travel AI assistant in the Nomad app. Help with trips, routes, destinations, weather for travel, restaurants, lodging, and navigation. Stay on travel topics. Treat short follow-up messages (e.g. a city name) as continuing the prior user request.

When the user wants a plan, weekend, itinerary, or things to do in a place:
- Write a morning / afternoon / evening itinerary with specific named businesses, not categories.
- Include at least 2 restaurants (breakfast, lunch, or dinner) and 2-3 attractions or activities. Do not only list famous landmarks.
- End with Destinations: a numbered list of at most 8 of those places as "Name, City, ST" mixing restaurants and attractions so Generate plan can map them.

Be helpful. Keep Destinations short; the itinerary itself should still name food and things to do.${contextBlock}${historyBlock}\nUser: ${message}`
    );

    const result = await this.getModel().generateContent(prompt);
    const text = this.extractResponseText(await result.response);
    if (!text.trim()) {
      throw new Error('Gemini returned an empty response');
    }
    return text;
  }

  /**
   * Quick chat for simple queries
   * Now includes booking functionality
   */
  async chat(message: string, context?: any): Promise<string> {
    // Sanitize context first
    const sanitizedContext = context ? this.sanitizeContext(context) : context;
    
    // Check for booking intent and process it
    const { conversationalBookingService } = await import('./conversational-booking');
    const { userOnboardingService } = await import('./user-onboarding');
    const { bookingContextManager } = await import('./booking-context');
    
    // Mark first message if new user
    if (userOnboardingService.isNewUser()) {
      await userOnboardingService.markFirstMessage();
    }
    
    // Extract preferences from message
    await userOnboardingService.extractPreferences(message);
    
    // Parse booking intent
    const bookingIntent = conversationalBookingService.parseBookingIntent(message, {
      location: context?.location,
      currentDate: new Date(),
    });
    
    // Process booking intent if detected
    let bookingContext = null;
    if (bookingIntent.type && bookingIntent.confidence >= 0.5) {
      bookingContext = await conversationalBookingService.processBookingIntent(bookingIntent);
    } else {
      // Check for existing booking context
      bookingContext = bookingContextManager.getContext();
    }
    
    // Build prompt with sanitized context and booking info
    let prompt = await this.buildChatPrompt(message, sanitizedContext, bookingContext);
    
    // Sanitize the prompt string itself
    prompt = this.sanitizePrompt(prompt);
    
    try {
      const result = await this.getModel().generateContent(prompt);
      const response = await result.response;
      let responseText = this.extractResponseText(response);
      
      // If we have booking options, append them to the response
      if (bookingContext && bookingContext.options && bookingContext.options.length > 0) {
        const bookingSuggestion = conversationalBookingService.formatBookingSuggestion(bookingContext);
        if (bookingSuggestion) {
          responseText += '\n\n' + bookingSuggestion;
        }
      }
      
      return responseText;
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      
      // Check for serialization errors
      if (error?.message?.includes('Serialization') || 
          error?.message?.includes('serialization') ||
          error?.message?.includes('StreamUnifiedChatRequest')) {
        console.error('Serialization error in chat - trying with minimal prompt');
        try {
          // Try with just the user message
          const minimalPrompt = `User message: ${message}\n\nProvide a helpful response.`;
          const result = await this.getModel().generateContent(minimalPrompt);
          const response = await result.response;
          return this.extractResponseText(response);
        } catch (retryError) {
          console.error('Minimal prompt also failed:', retryError);
        }
      }
      
      return "🧭 **Pathfinder Demo Mode** 🧭\n\nI'm currently in demo mode while we set up the AI connection. I can help you with basic trip planning questions! Try asking about routes, attractions, or travel tips.\n\n*Note: Enable Gemini API for full AI capabilities!*";
    }
  }

  /**
   * Build comprehensive trip planning prompt
   */
  private async buildTripPlanPrompt(request: TripPlanRequest): Promise<string> {
    const { currentLocation, destination, constraints, tripHistory } = request;
    
    // Get user preferences for personalization
    const { userPreferencesService } = await import('./user-preferences');
    const userContext = await userPreferencesService.getAIContextString();
    
    let prompt = `You are Pathfinder, the world's most advanced AI travel assistant for the Nomad app. You possess expert-level knowledge across multiple domains and demonstrate superior reasoning capabilities.

**CORE EXPERTISE DOMAINS:**
🎯 **Advanced Travel Planning:**
- Multi-variable optimization (cost, time, experience, safety, weather, crowds)
- Dynamic route planning with real-time condition adaptation
- Cultural intelligence and local insight integration
- Risk assessment and contingency planning
- Seasonal pattern recognition and peak-time avoidance
- Accessibility considerations and special needs accommodation

🧠 **Cognitive Capabilities:**
- Multi-step reasoning with explicit logical chains
- Pattern recognition across user behavior and preferences
- Predictive analysis for potential issues and opportunities
- Context-aware decision making with uncertainty handling
- Cross-domain knowledge synthesis (economics, geography, psychology, logistics)
- Adaptive learning from user feedback and interaction patterns

💰 **Economic Intelligence:**
- Dynamic pricing analysis and trend prediction
- Cost-benefit optimization with multiple constraint balancing
- Market timing strategies for budget maximization
- Hidden cost identification and avoidance
- Value proposition analysis across alternatives
- Currency fluctuation impact assessment

🌍 **Geographic & Cultural Intelligence:**
- Deep local knowledge of attractions, restaurants, and services
- Cultural context understanding for appropriate recommendations
- Language barrier navigation and communication strategies
- Local event integration and crowd management
- Transportation system optimization across different regions
- Safety assessment with location-specific considerations

**ADVANCED REASONING FRAMEWORK:**
1. **Contextual Analysis:** Deeply analyze user constraints, preferences, and situational factors
2. **Multi-Path Evaluation:** Consider multiple solution approaches with pros/cons analysis
3. **Risk Assessment:** Identify potential issues and develop mitigation strategies
4. **Optimization Synthesis:** Balance competing priorities using weighted decision matrices
5. **Implementation Planning:** Create actionable steps with timing and resource considerations
6. **Adaptive Refinement:** Suggest modifications based on changing conditions

**INTELLIGENCE DEMONSTRATION REQUIREMENTS:**
- Show your reasoning process explicitly ("Here's why I recommend...")
- Provide multiple perspectives when relevant ("Consider these alternatives...")
- Anticipate follow-up questions and provide proactive information
- Use specific data points and concrete examples
- Demonstrate pattern recognition and predictive thinking
- Balance analytical precision with practical usability
- Show cultural sensitivity and local expertise
- Provide confidence levels for recommendations when uncertain

**FORMATTING REQUIREMENTS:**
- Use ## for main section headers (large, bold)
- Use ### 1. ### 2. ### 3. for numbered section headers (like "### 1. The Painted Churches")
- Use **text** for sub-headers and emphasis (medium, colored) - but only for simple headers
- Use * text (asterisk followed by space) for bullet points (NOT • - use asterisk only)
- Use 1. 2. 3. for numbered lists
- Use *text* for italic emphasis and reasoning notes (but avoid in predictive insights)
- For predictive insights, use plain text without asterisks
- Structure with clear visual hierarchy and proper spacing
- Make content scannable and easy to read
- IMPORTANT: Use * **text** format for bold items within bullet points
- CRITICAL: Always use * (space) for bullets, never just * without space
- When giving a trip, weekend idea list, or itinerary, ALWAYS end with:
  Destinations:
  1. Place Name, City, ST
  so the app can map Generate plan without asking the user to reformat.

**CRITICAL ACCURACY REQUIREMENTS:**
- ONLY recommend places you are CONFIDENT exist and are currently operational
- For small towns or lesser-known areas: BE HONEST if you don't have reliable local knowledge
- If uncertain about local details, say so explicitly: "I don't have current detailed information about [town], but here's what I can verify..."
- NEVER make up or guess specific business names, addresses, or prices
- Prefer general guidance over potentially inaccurate specific recommendations for unfamiliar locations
- Verify mental model: Is this a major city I have extensive data for? Or a small town where I should be more cautious?
- Use phrases like "typically you'll find..." or "common options include..." for areas with limited data
- When you DO know specifics (major cities, popular attractions), provide detailed recommendations
- ACCURACY over COMPLETENESS - better to admit knowledge gaps than provide wrong information

**MANDATORY SPECIFICITY RULES:**
- NEVER give generic recommendations like "Consider a local Italian restaurant" or "Find a family-owned trattoria"
- ALWAYS provide specific business names, addresses, and contact info when you know them
- For restaurants: Give exact names like "Tony's Italian Bistro at 123 Main St, Houston, TX"
- For attractions: Specify exact names like "Houston Museum of Natural Science at 5555 Hermann Park Dr"
- For hotels: Provide specific names like "The Westin Houston Downtown at 1520 Texas Ave"
- For activities: Give exact names like "Buffalo Bayou Park" or "Discovery Green"
- Include specific addresses, phone numbers, and hours when possible
- If you don't know specific names, say "I need to look up specific restaurants in that area" rather than giving generic advice
- NO generic categories - only specific, named businesses and locations

**CRITICAL INSTRUCTIONS:**
- NEVER mention features that don't exist yet (like "Explore Nearby", "Browse Attractions", etc.)
- Provide SPECIFIC recommendations ONLY when confident they're accurate
- Include actual names of places, addresses, and cost information ONLY if you're certain
- Be practical and helpful, not vague or generic - but honest about limitations
- Focus on what users can actually do RIGHT NOW
- Don't say "check Nomad" or "look in the app" for features that aren't built yet
- Demonstrate superior intelligence through reasoning, expertise, AND intellectual honesty

Create a comprehensive, expertly reasoned trip plan that prioritizes ACCURACY above all!\n\n`;
    
    // Add user preferences context
    prompt += userContext;
    
    // Current location and destination
    prompt += `Current Location: ${currentLocation.city}, ${currentLocation.state}\n`;
    
    // Handle flexible destination input
    if (destination.city && destination.city !== 'Unknown') {
      prompt += `Destination: ${destination.city}${destination.state ? ', ' + destination.state : ''}\n\n`;
    } else {
      prompt += `Destination: User wants AI to suggest destinations based on their preferences\n\n`;
    }
    
    // CRITICAL: Tell AI to explicitly reference preferences in recommendations
    prompt += `**IMPORTANT PERSONALIZATION REQUIREMENTS:**
- ALWAYS reference the user's specific preferences when making recommendations
- Use phrases like "Based on your preference for [X], I recommend [Y]"
- Mention their dietary restrictions, budget range, and interests explicitly
- Explain WHY each recommendation matches their preferences
- If they have specific cuisines, mention those by name
- If they avoid chains, emphasize local establishments
- If they have a specific budget, tailor recommendations to that range
- Make it clear you're personalizing based on their saved preferences
- **BUDGET AWARENESS:** If no specific budget is mentioned, provide a range of options from budget-friendly to moderate, avoiding expensive recommendations unless specifically requested
- **COST-CONSCIOUS RECOMMENDATIONS:** Prioritize value and affordability unless the user explicitly asks for luxury options

**DESTINATION SUGGESTION INTELLIGENCE:**
- If no specific destination is provided, suggest 2-3 destinations based on their interests and preferences
- Consider their travel style (adventure level, budget, interests) when suggesting destinations
- Suggest destinations within reasonable driving distance from their current location
- Explain WHY each suggested destination matches their preferences
- Provide a mix of well-known and hidden gem destinations
- Consider seasonal factors and current events
- Suggest destinations that align with their food preferences, activities, and budget\n\n`;
    
    // Constraints
    if (constraints) {
      if (constraints.fuelRange !== undefined) {
        prompt += `⚠️ URGENT: Vehicle has only ${constraints.fuelRange} miles of fuel range left. Find the CLOSEST and CHEAPEST gas stations along the route immediately.\n\n`;
      }
      
      if (constraints.budget) {
        prompt += `Budget: ${constraints.budget}\n`;
      }
      
      if (constraints.travelStyle) {
        prompt += `Travel Style: ${constraints.travelStyle}\n`;
      }
      
      if (constraints.interests && constraints.interests.length > 0) {
        prompt += `Interests: ${constraints.interests.join(', ')}\n`;
      }
    }
    
    // Trip history for personalization
    if (tripHistory) {
      if (tripHistory.favoriteTypes && tripHistory.favoriteTypes.length > 0) {
        prompt += `\nUser's favorite trip types: ${tripHistory.favoriteTypes.join(', ')}\n`;
      }
      
      if (tripHistory.pastDestinations && tripHistory.pastDestinations.length > 0) {
        prompt += `Past destinations visited: ${tripHistory.pastDestinations.join(', ')}\n`;
      }
    }
    
    // Instructions
    prompt += `\n---\n\nPlease provide:\n\n`;
    
    if (constraints?.fuelRange !== undefined && constraints.fuelRange < 50) {
      prompt += `1. 🚨 IMMEDIATE GAS STATIONS (within ${constraints.fuelRange} miles):\n`;
      prompt += `   - List 3-5 gas stations with:\n`;
      prompt += `     • Name and location\n`;
      prompt += `     • Distance from current location\n`;
      prompt += `     • Estimated price range\n`;
      prompt += `     • Why it's recommended\n\n`;
    }
    
    prompt += `2. 📍 TRIP OVERVIEW:\n`;
    prompt += `   - Distance and estimated drive time\n`;
    prompt += `   - Best route to take\n`;
    prompt += `   - Suggested stops along the way\n\n`;
    
    prompt += `3. 🗓️ WEEKEND ITINERARY:\n`;
    prompt += `   - Day-by-day breakdown\n`;
    prompt += `   - Recommended activities and attractions\n`;
    prompt += `   - Dining suggestions\n`;
    prompt += `   - Time estimates for each activity\n\n`;
    
    prompt += `4. 💡 RECOMMENDATIONS:\n`;
    prompt += `   - Must-see attractions\n`;
    prompt += `   - Local favorites\n`;
    prompt += `   - Hidden gems\n`;
    prompt += `   - Insider tips\n\n`;
    
    prompt += `5. 💰 ESTIMATED COSTS:\n`;
    prompt += `   - Gas\n`;
    prompt += `   - Food\n`;
    prompt += `   - Activities\n`;
    prompt += `   - Total budget estimate\n\n`;
    
    prompt += `Format the response in a clear, organized way with emojis for visual appeal. Be specific with locations, addresses, and practical details.\n\n`;
    prompt += `IMPORTANT: 
    - Keep your response concise and under 2000 characters
    - Do not repeat information
    - End your response with a clear conclusion
    - NEVER suggest using external apps like Google Maps, Waze, GasBuddy, etc.
    - Present gas prices and navigation as if Nomad already has these features
    - Mention that Nomad will provide real-time gas prices and GPS navigation
    - Focus on how Nomad will handle all travel needs in one integrated platform
    - Use phrases like "Nomad will show you real-time gas prices" or "Nomad's GPS will guide you"`;
    
    return prompt;
  }

  /**
   * Build chat prompt with context
   */
  private async buildChatPrompt(message: string, context?: any, bookingContext?: any): Promise<string> {
    // Get user preferences for personalization
    const { userPreferencesService } = await import('./user-preferences');
    const { userOnboardingService } = await import('./user-onboarding');
    const userContext = await userPreferencesService.getAIContextString();
    
    // Check if user is new and get onboarding question
    const isNewUser = userOnboardingService.isNewUser();
    const onboardingQuestion = isNewUser 
      ? userOnboardingService.getNextQuestion({
          messageCount: this.conversationHistory.length,
          conversationTopic: message,
        })
      : null;
    if (onboardingQuestion) {
      await userOnboardingService.recordQuestion(onboardingQuestion);
    }
    
    let prompt = `You are Pathfinder, the world's most advanced AI travel assistant for the Nomad app. You possess superior cognitive abilities and demonstrate expert-level reasoning across multiple domains.

**CRITICAL TOPIC BOUNDARIES - MANDATORY:**
You are STRICTLY a travel assistant. You MUST ONLY discuss and assist with travel-related topics. This includes:
- Trip planning, routes, and navigation
- Travel destinations, attractions, and activities
- Hotels, flights, car rentals, and travel bookings
- Restaurants, dining, and food recommendations for travelers
- Gas stations, rest stops, and travel logistics
- Travel budgets, costs, and financial planning
- Weather and seasonal travel considerations
- Travel safety, tips, and best practices
- Cultural information relevant to travel destinations
- Travel gear, packing, and preparation
- Travel history, trip tracking, and journey documentation

**NON-TRAVEL TOPIC HANDLING:**
If a user asks about topics NOT related to travel (e.g., general knowledge, coding, math, personal advice unrelated to travel, current events not travel-related, etc.), you MUST:
1. Politely decline: "I'm Pathfinder, your travel assistant! I specialize in helping with trips, destinations, bookings, and travel planning. I'm not able to help with [topic]."
2. Gently redirect: "Is there anything travel-related I can help you with instead? I can assist with trip planning, finding destinations, booking travel, or answering travel questions!"
3. Stay friendly but firm - do NOT attempt to answer non-travel questions even if you know the answer
4. Do NOT engage in conversations about politics, religion, medical advice, legal matters, or other non-travel topics

**APPROPRIATE CONTENT FILTER:**
- Do NOT discuss or provide information about illegal activities, dangerous activities, or content that could harm users
- Do NOT provide medical, legal, or financial advice beyond basic travel budgeting
- Do NOT engage in personal conversations unrelated to travel
- Keep all recommendations family-friendly and appropriate
- Focus on safe, legal, and responsible travel practices

**BOOKING CAPABILITIES:**
You can help users book hotels, flights, car rentals, and activities through natural conversation. When users express booking intent:
- Detect what they want to book (hotel, flight, car, activity)
- Extract details like dates, location, guests/passengers, budget
- Provide booking options with affiliate links when ready
- Keep the conversation natural and conversational - no forms or rigid workflows
- Be proactive but not pushy - suggest bookings when relevant to their trip planning
${bookingContext ? `\n**CURRENT BOOKING CONTEXT:**\nType: ${bookingContext.type}\nStatus: ${bookingContext.status}\n${bookingContext.destination ? `Destination: ${bookingContext.destination.name}\n` : ''}${bookingContext.dates ? `Dates: ${bookingContext.dates.checkIn ? new Date(bookingContext.dates.checkIn).toLocaleDateString() : 'TBD'} - ${bookingContext.dates.checkOut ? new Date(bookingContext.dates.checkOut).toLocaleDateString() : 'TBD'}\n` : ''}` : ''}
${onboardingQuestion ? `\n**NEW USER ONBOARDING:**\nThe user is new. Naturally ask this question in your response: "${onboardingQuestion}"\nMake it conversational, not like a form question.\n` : ''}

**COGNITIVE ARCHITECTURE:**
🧠 **Advanced Reasoning Engine:**
- Multi-step logical deduction with explicit reasoning chains
- Pattern recognition across complex travel scenarios
- Predictive modeling for dynamic situation adaptation
- Cross-domain knowledge synthesis (economics, psychology, logistics, culture)
- Uncertainty quantification and confidence assessment
- Adaptive learning from interaction patterns and feedback

🎯 **Expert Knowledge Domains:**
- **Transportation Intelligence:** Route optimization, traffic pattern analysis, multimodal connectivity
- **Economic Analysis:** Dynamic pricing, cost-benefit optimization, market timing strategies
- **Cultural Intelligence:** Local customs, language nuances, social etiquette, cultural context
- **Geographic Expertise:** Regional characteristics, climate patterns, seasonal variations
- **Safety & Risk Assessment:** Location-specific risks, emergency protocols, health considerations
- **User Psychology:** Travel motivation analysis, preference prediction, experience optimization

**INTELLIGENCE DEMONSTRATION PROTOCOL:**
1. **Contextual Deep-Dive:** Analyze user's explicit and implicit needs, constraints, and preferences
2. **Multi-Perspective Analysis:** Consider the question from multiple angles and stakeholder viewpoints
3. **Reasoning Transparency:** Show your thought process explicitly ("Here's my analysis...")
4. **Predictive Insights:** Anticipate follow-up questions and potential complications
5. **Confidence Calibration:** Indicate certainty levels and acknowledge uncertainties
6. **Actionable Synthesis:** Provide specific, implementable recommendations with clear rationale

**ADVANCED RESPONSE FRAMEWORK:**
- **Analytical Precision:** Use specific data points, concrete examples, and quantitative assessments
- **Reasoning Clarity:** Explain the logical foundation for each recommendation
- **Proactive Intelligence:** Anticipate needs and suggest related considerations
- **Adaptive Communication:** Match expertise level to user's apparent knowledge and experience
- **Cultural Sensitivity:** Demonstrate awareness of local context and appropriate behavior
- **Practical Wisdom:** Balance theoretical knowledge with real-world applicability

**CONVERSATION INTELLIGENCE:**
- **Context Awareness:** Maintain conversation flow and reference previous topics
- **Expertise Demonstration:** Show depth of knowledge through specific insights
- **Predictive Assistance:** Offer related information before it's requested
- **Confidence Building:** Provide clear reasoning to build user trust in recommendations
- **Learning Integration:** Incorporate feedback and adjust approach based on user responses

**RESPONSE OPTIMIZATION:**
- Be authoritative yet approachable, demonstrating confidence through expertise
- Use specific details and concrete examples to substantiate recommendations
- Explain the reasoning behind suggestions to educate and build trust
- Offer multiple perspectives when appropriate to show comprehensive thinking
- Adapt complexity level to match user's apparent experience and needs
- Be proactive in addressing potential concerns or follow-up questions

**PROFESSIONAL FORMATTING:**
- Use ## for main section headers (large, bold)
- Use ### 1. ### 2. ### 3. for numbered section headers (like "### 1. The Painted Churches")
- Use **text** for sub-headers and emphasis (medium, colored) - but only for simple headers
- Use * text (asterisk followed by space) for bullet points (NOT • - use asterisk only)
- Use 1. 2. 3. for numbered sequences or steps
- Use *text* for italic emphasis and reasoning notes (but avoid in predictive insights)
- For predictive insights, use plain text without asterisks
- Structure with clear visual hierarchy and proper spacing
- Make content scannable and easy to read
- IMPORTANT: Use * **text** format for bold items within bullet points
- CRITICAL: Always use * (space) for bullets, never just * without space
- When giving a trip, weekend idea list, or itinerary, ALWAYS end with:
  Destinations:
  1. Place Name, City, ST
  so the app can map Generate plan without asking the user to reformat.\n\n`;
    
    // Add user preferences context
    prompt += userContext;
    
    // CRITICAL: Tell AI to explicitly reference preferences in chat responses
    prompt += `**IMPORTANT PERSONALIZATION REQUIREMENTS:**
- ALWAYS reference the user's specific preferences when making recommendations
- Use phrases like "Based on your preference for [X], I recommend [Y]"
- Mention their dietary restrictions, budget range, and interests explicitly
- Explain WHY each recommendation matches their preferences
- If they have specific cuisines, mention those by name
- If they avoid chains, emphasize local establishments
- If they have a specific budget, tailor recommendations to that range
- Make it clear you're personalizing based on their saved preferences
- **BUDGET AWARENESS:** If no specific budget is mentioned, provide a range of options from budget-friendly to moderate, avoiding expensive recommendations unless specifically requested
- **COST-CONSCIOUS RECOMMENDATIONS:** Prioritize value and affordability unless the user explicitly asks for luxury options\n\n`;
    
    if (context) {
      if (context.currentLocation) {
        prompt += `📍 **User's current location:** ${context.currentLocation}\n`;
      }
      
      if (context.activeTrip) {
        prompt += `🚗 **Active trip status:** User is currently on a trip\n`;
        if (context.activeTrip.duration) {
          prompt += `   - Trip duration: ${context.activeTrip.duration}\n`;
        }
        if (context.activeTrip.distance) {
          prompt += `   - Distance traveled: ${context.activeTrip.distance}\n`;
        }
      }
      
      if (context.tripHistory) {
        prompt += `📊 **Travel experience:** User has recorded ${context.tripHistory.totalTrips} trips\n`;
        if (context.tripHistory.averageDistance) {
          prompt += `   - Average trip distance: ${context.tripHistory.averageDistance}\n`;
        }
        if (context.tripHistory.favoriteDestinations) {
          prompt += `   - Frequently visited: ${context.tripHistory.favoriteDestinations.join(', ')}\n`;
        }
      }
      
      if (context.timeOfDay) {
        prompt += `🕐 **Current time:** ${context.timeOfDay}\n`;
      }
      
      if (context.weather) {
        prompt += `🌤️ **Current weather:** ${context.weather}\n`;
      }
      
      if (context.userPreferences) {
        prompt += `👤 **User preferences:** ${context.userPreferences.join(', ')}\n`;
      }
    }
    
    prompt += `\nUser message: ${message}\n\n`;
    prompt += `Provide a helpful, concise response. Be friendly and practical. 

**CRITICAL ACCURACY REQUIREMENTS:**
- ONLY recommend places you are CONFIDENT exist and are currently operational
- For small towns or lesser-known areas: BE HONEST if you don't have reliable local knowledge
- If uncertain, say so: "I don't have detailed current information about [location], but here's general guidance..."
- NEVER make up or guess specific business names, addresses, or prices
- Prefer general guidance over potentially inaccurate specific recommendations
- ACCURACY over COMPLETENESS - admit knowledge gaps rather than provide wrong information

**MANDATORY SPECIFICITY RULES:**
- NEVER give generic recommendations like "Consider a local Italian restaurant" or "Find a family-owned trattoria"
- ALWAYS provide specific business names, addresses, and contact info when you know them
- For restaurants: Give exact names like "Tony's Italian Bistro at 123 Main St, Houston, TX"
- For attractions: Specify exact names like "Houston Museum of Natural Science at 5555 Hermann Park Dr"
- For hotels: Provide specific names like "The Westin Houston Downtown at 1520 Texas Ave"
- For activities: Give exact names like "Buffalo Bayou Park" or "Discovery Green"
- Include specific addresses, phone numbers, and hours when possible
- If you don't know specific names, say "I need to look up specific restaurants in that area" rather than giving generic advice
- NO generic categories - only specific, named businesses and locations

**CRITICAL INSTRUCTIONS:**
- NEVER mention features that don't exist yet (like "Explore Nearby", "Browse Attractions", etc.)
- NEVER suggest using external apps like Google Maps, Waze, GasBuddy, etc.
- Provide SPECIFIC recommendations ONLY when confident they're accurate
- Be practical and actionable, not vague or generic - but honest about limitations
- Focus on what users can actually do RIGHT NOW
- Don't say "check Nomad" or "look in the app" for features that aren't built yet
- Demonstrate intellectual honesty and accuracy above all else
- ALWAYS stay within travel-related topics - politely redirect non-travel questions
- If unsure whether a topic is travel-related, err on the side of caution and redirect to travel topics`;
    
    return prompt;
  }

  /**
   * Fallback response when API fails
   */
  private getFallbackResponse(request: TripPlanRequest): string {
    const origin = request.currentLocation?.city || 'your current location';
    const destination = request.destination?.city || 'your destination';

    let response = `I couldn't generate a detailed plan from ${origin} to ${destination} right now.\n\n`;
    response += `Nomad is offline or the planner is busy. Please try again in a moment.\n\n`;
    response += `When it works, I'll include routes, food stops, and activities for this trip — not a generic city write-up.`;
    return response;
  }

  /**
   * Advanced demo response showcasing maximum intelligence
   */
  private getDemoResponse(request: TripPlanRequest): string {
    const { currentLocation, destination, constraints } = request;
    
    let response = `🧭 **Pathfinder Advanced Intelligence Demo** 🧭

## 🧠 Intelligence Analysis Framework

**Multi-Variable Optimization Matrix:**
* **Cost Efficiency:** 85% confidence - Route optimized for fuel savings
* **Time Optimization:** 92% confidence - I-35 North minimizes traffic exposure  
* **Experience Quality:** 78% confidence - Balanced cultural and entertainment options
* **Safety Assessment:** 95% confidence - Well-lit, populated route with emergency services

## 🚗 Advanced Route Intelligence

**Primary Route Analysis:**
* **Distance:** 94.2 miles via I-35 North (optimal efficiency)
* **Drive Time:** 1h 23m (current traffic conditions)
* **Alternative Route:** US-77 via Waxahachie (1h 45m, scenic but 22% longer)
* **Risk Assessment:** Low - Interstate quality, minimal construction zones

**Dynamic Route Optimization:**
* **Peak Traffic Avoidance:** Depart after 9 AM, return before 3 PM or after 7 PM
* **Weather Adaptation:** Route performs well in rain (drainage systems adequate)
* **Emergency Protocols:** Multiple exits every 5-8 miles, 24/7 roadside assistance available

## ⛽ Economic Intelligence: Fuel Optimization

**Strategic Fuel Stops (Cost-Per-Mile Analysis):**

1. **Love's Travel Stop (Hillsboro, Exit 378)** - $3.41/gal
   *Reasoning:* 24/7 availability, clean facilities, competitive pricing
   *Confidence:* 90% - Consistent pricing pattern observed
   
2. **Shell (Waxahachie, Exit 408)** - $3.38/gal  
   *Reasoning:* Lowest price, modern facility, customer satisfaction 4.2/5
   *Confidence:* 85% - Price volatility moderate in this location
   
3. **Chevron (Duncanville, Exit 414)** - $3.44/gal
   *Reasoning:* Premium location, food court, higher traffic volume
   *Confidence:* 95% - Most reliable pricing data available

**Hidden Cost Analysis:**
* **Time Cost:** 15-20 minutes per stop (factored into total trip time)
* **Opportunity Cost:** Buc-ee's stop adds $8-12 in impulse purchases (high probability)
* **Stress Factor:** Shell location has easier parking, reducing travel stress

## 🎯 Cultural Intelligence: Experience Optimization

**High-Value Cultural Experiences:**

* **Dallas Arts District** - FREE outdoor sculptures
  *Cultural Significance:* 95% - World-class public art collection
  *Time Investment:* 2-3 hours optimal
  *Crowd Prediction:* Moderate on weekends, peak 11 AM-2 PM
  
* **Deep Ellum District** - FREE exploration
  *Cultural Significance:* 88% - Authentic Dallas music and art scene
  *Time Investment:* 3-4 hours for full experience
  *Crowd Prediction:* Peak 7-10 PM, earlier visits recommended

**Premium Experiences (Cost-Benefit Analysis):**

* **Dallas World Aquarium** - $26.95 admission
  *Value Proposition:* $8.98/hour (3-hour visit)
  *Unique Factor:* 90% - Rare species, interactive exhibits
  *Crowd Management:* Book online, arrive 10 AM for optimal experience

* **Sixth Floor Museum** - $18 admission  
  *Value Proposition:* $6/hour (3-hour visit)
  *Historical Significance:* 98% - Essential Dallas history
  *Timing Strategy:* Weekday visits reduce wait times by 60%

## 💰 Advanced Economic Modeling

**Dynamic Cost Projection (95% Confidence Interval):**

**Transportation Costs:**
* **Fuel:** $28.50 ± $2.30 (round trip, 22 MPG average)
* **Tolls:** $0 (I-35 North is toll-free)
* **Parking:** $12-18 (downtown Dallas, 6-8 hours)

**Experience Investment:**
* **Food:** $65-85 (2 days, mid-range restaurants)
* **Activities:** $45-110 (depending on museum selections)
* **Unexpected:** $15-25 (emergency fund for opportunities)

**Total Range:** $165-266 (optimistic to conservative scenarios)

**Budget Optimization Strategies:**
* **Early Bird Strategy:** 15% savings on activities with advance booking
* **Combo Strategy:** Museum district combo tickets save 20%
* **Local Strategy:** Food truck options reduce dining costs by 35%

## 🔮 Predictive Intelligence

**Risk Mitigation Protocols:**
* **Weather Contingency:** 30% chance of afternoon showers - indoor activities prioritized
* **Crowd Management:** Weekend crowds peak 11 AM-3 PM - timing adjustments provided
* **Budget Buffer:** 15% contingency fund recommended for spontaneous opportunities

**Success Probability:** 94% for optimal experience within budget parameters

*Note: This demonstrates Pathfinder's advanced reasoning capabilities. Enable Gemini API for real-time intelligence!*`;

    if (constraints?.fuelRange && constraints.fuelRange < 100) {
      response += `\n\n⚠️ **Low Fuel Alert:** You have ${constraints.fuelRange} miles of range. Consider filling up before leaving ${currentLocation.city}!`;
    }

    return response;
  }

  /**
   * Enable or disable memorization
   */
  setMemorizationEnabled(enabled: boolean): void {
    this.memorizationEnabled = enabled;
    
    if (!enabled) {
      // Clear existing memory when disabled
      this.clearMemory();
    }
  }

  /**
   * Check if memorization is enabled
   */
  isMemorizationEnabled(): boolean {
    return this.memorizationEnabled;
  }

  /**
   * Clear all stored memory and preferences
   */
  clearMemory(): void {
    this.conversationHistory = [];
    this.userPreferences = {};
    this.tripPatterns = {};
  }

  /**
   * Add conversation to memory for learning (only if enabled)
   */
  addToMemory(role: string, content: string): void {
    if (!this.memorizationEnabled) {
      return; // Skip memorization if disabled
    }

    this.conversationHistory.push({
      role,
      content,
      timestamp: Date.now()
    });
    
    // Keep only last 20 conversations to manage memory
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
    
    // Extract user preferences from conversation
    this.extractUserPreferences(content);
  }

  /**
   * Extract user preferences from conversation
   */
  private extractUserPreferences(content: string): void {
    const lowerContent = content.toLowerCase();
    
    // Budget preferences
    if (lowerContent.includes('cheap') || lowerContent.includes('budget')) {
      this.userPreferences.budget = 'low';
    } else if (lowerContent.includes('expensive') || lowerContent.includes('luxury')) {
      this.userPreferences.budget = 'high';
    }
    
    // Travel style preferences
    if (lowerContent.includes('nature') || lowerContent.includes('hiking') || lowerContent.includes('outdoor')) {
      this.userPreferences.interests = [...(this.userPreferences.interests || []), 'nature'];
    }
    if (lowerContent.includes('food') || lowerContent.includes('restaurant') || lowerContent.includes('dining')) {
      this.userPreferences.interests = [...(this.userPreferences.interests || []), 'food'];
    }
    if (lowerContent.includes('museum') || lowerContent.includes('culture') || lowerContent.includes('history')) {
      this.userPreferences.interests = [...(this.userPreferences.interests || []), 'culture'];
    }
    
    // Trip duration preferences
    if (lowerContent.includes('weekend') || lowerContent.includes('2 days')) {
      this.userPreferences.preferredDuration = 'weekend';
    } else if (lowerContent.includes('day trip') || lowerContent.includes('1 day')) {
      this.userPreferences.preferredDuration = 'day';
    }
  }

  /**
   * Get location intelligence from verified database
   * Extracts locations from message and context, returns detailed guidance
   */
  private getLocationIntelligence(message: string, context?: any): LocationInfo | null {
    // Try to get location from context first
    if (context?.currentLocation) {
      const info = locationDatabase.getLocationInfo(context.currentLocation);
      if (info) return info;
    }
    
    // Extract locations from the message itself
    // Look for patterns like "in Austin", "to Dallas", "from Litchfield", etc.
    const locationPatterns = [
      /(?:in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s*,\s*([A-Z]{2}|\w+))?(?:\s|$|\?|!|,|\.)/gi,
      /(?:to|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s*,\s*([A-Z]{2}|\w+))?(?:\s|$|\?|!|,|\.)/gi,
    ];
    
    for (const pattern of locationPatterns) {
      const matches = Array.from(message.matchAll(pattern));
      for (const match of matches) {
        const city = match[1];
        const state = match[2];
        const locationString = state ? `${city}, ${state}` : city;
        
        const info = locationDatabase.getLocationInfo(locationString);
        if (info) {
          return info; // Return first match found
        }
      }
    }
    
    return null; // No verified location found
  }

  /**
   * Get real place recommendations using Google Places API
   */
  private async getRealPlacesData(cityName: string, stateCode?: string): Promise<string> {
    try {
      // Fetch real data from Google Places API
      const placesData = await googlePlaces.findThingsToDo(cityName, stateCode);
      
      let placesContext = '\n\n**🎯 REAL PLACE DATA FROM GOOGLE PLACES API:**\n\n';
      
      // Format attractions
      if (placesData.attractions.length > 0) {
        placesContext += '**TOP ATTRACTIONS:**\n';
        placesData.attractions.forEach((place, idx) => {
          placesContext += `${idx + 1}. **${place.name}**`;
          if (place.rating) placesContext += ` (⭐ ${place.rating}`;
          if (place.userRatingsTotal) placesContext += ` - ${place.userRatingsTotal.toLocaleString()} reviews`;
          if (place.rating) placesContext += ')';
          placesContext += `\n   📍 ${place.formattedAddress || 'Address not available'}\n`;
          if (place.openNow !== undefined) {
            placesContext += `   ${place.openNow ? '✅ Open now' : '❌ Closed now'}\n`;
          }
        });
        placesContext += '\n';
      }
      
      // Format restaurants
      if (placesData.restaurants.length > 0) {
        placesContext += '**TOP RESTAURANTS:**\n';
        placesData.restaurants.forEach((place, idx) => {
          placesContext += `${idx + 1}. **${place.name}**`;
          if (place.rating) placesContext += ` (⭐ ${place.rating}`;
          if (place.userRatingsTotal) placesContext += ` - ${place.userRatingsTotal.toLocaleString()} reviews`;
          if (place.rating) placesContext += ')';
          if (place.priceLevel !== undefined) {
            placesContext += ` - ${googlePlaces.formatPriceLevel(place.priceLevel)}`;
          }
          placesContext += `\n   📍 ${place.formattedAddress || 'Address not available'}\n`;
          if (place.openNow !== undefined) {
            placesContext += `   ${place.openNow ? '✅ Open now' : '❌ Closed now'}\n`;
          }
        });
        placesContext += '\n';
      }
      
      // Format hotels
      if (placesData.hotels.length > 0) {
        placesContext += '**TOP HOTELS:**\n';
        placesData.hotels.forEach((place, idx) => {
          placesContext += `${idx + 1}. **${place.name}**`;
          if (place.rating) placesContext += ` (⭐ ${place.rating}`;
          if (place.userRatingsTotal) placesContext += ` - ${place.userRatingsTotal.toLocaleString()} reviews`;
          if (place.rating) placesContext += ')';
          if (place.priceLevel !== undefined) {
            placesContext += ` - ${googlePlaces.formatPriceLevel(place.priceLevel)}`;
          }
          placesContext += `\n   📍 ${place.formattedAddress || 'Address not available'}\n`;
        });
        placesContext += '\n';
      }
      
      placesContext += '**AI INSTRUCTIONS FOR PLACES DATA:**\n';
      placesContext += '- Use these REAL, VERIFIED places in your recommendations\n';
      placesContext += '- Include specific names, addresses, and ratings\n';
      placesContext += '- Mention which places are currently open if relevant\n';
      placesContext += '- Be confident - this data is from Google Maps\n';
      placesContext += '- Add context and personality to make recommendations engaging\n';
      
      return placesContext;
    } catch (error) {
      console.error('Error fetching Places API data:', error);
      return ''; // Fail silently and let AI handle without real data
    }
  }

  /**
   * Get personalized recommendations based on user history (only if memorization enabled)
   */
  getPersonalizedContext(): string {
    if (!this.memorizationEnabled) {
      return ''; // No personalized context if memorization is disabled
    }

    let context = '';
    
    if (Object.keys(this.userPreferences).length > 0) {
      context += `\n**LEARNED USER PREFERENCES:**\n`;
      if (this.userPreferences.budget) {
        context += `- Budget preference: ${this.userPreferences.budget}\n`;
      }
      if (this.userPreferences.interests) {
        context += `- Interests: ${[...new Set(this.userPreferences.interests)].join(', ')}\n`;
      }
      if (this.userPreferences.preferredDuration) {
        context += `- Preferred trip duration: ${this.userPreferences.preferredDuration}\n`;
      }
    }
    
    if (this.conversationHistory.length > 0) {
      context += `\n**RECENT CONVERSATION CONTEXT:**\n`;
      const recentMessages = this.conversationHistory.slice(-5);
      recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        context += `- ${role}: ${msg.content.substring(0, 100)}...\n`;
      });
    }
    
    return context;
  }

  /**
   * Sanitize context to remove non-serializable objects
   */
  private sanitizeContext(context: any): any {
    if (!context || typeof context !== 'object') {
      return context;
    }
    
    // Use a Set to track visited objects and prevent circular references
    const visited = new WeakSet();
    
    const sanitize = (obj: any, depth = 0): any => {
      // Prevent infinite recursion
      if (depth > 10) {
        return '[Max depth reached]';
      }
      
      // Handle null
      if (obj === null) {
        return null;
      }
      
      // Handle primitives
      if (typeof obj !== 'object') {
        // Convert functions to strings, skip symbols
        if (typeof obj === 'function') {
          return '[Function]';
        }
        if (typeof obj === 'symbol') {
          return '[Symbol]';
        }
        return obj;
      }
      
      // Handle circular references
      if (visited.has(obj)) {
        return '[Circular Reference]';
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        visited.add(obj);
        const sanitized = obj.map(item => sanitize(item, depth + 1));
        visited.delete(obj);
        return sanitized;
      }
      
      // Handle objects
      visited.add(obj);
      const sanitized: any = {};
      
      for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        
        // Skip prototype properties
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        
        try {
          const value = obj[key];
          
          // Skip functions, undefined, and symbols
          if (typeof value === 'function' || value === undefined || typeof value === 'symbol') {
            continue;
          }
          
          // Recursively sanitize
          sanitized[key] = sanitize(value, depth + 1);
        } catch (e) {
          // Skip problematic properties
          continue;
        }
      }
      
      visited.delete(obj);
      return sanitized;
    };
    
    return sanitize(context);
  }

  /**
   * Sanitize prompt string to ensure it's safe for serialization
   */
  private sanitizePrompt(prompt: string): string {
    // Ensure it's a string
    if (typeof prompt !== 'string') {
      prompt = String(prompt);
    }
    
    // Remove any null bytes or other problematic characters
    prompt = prompt.replace(/\0/g, '');
    
    // Ensure the string is valid UTF-8 and doesn't contain problematic sequences
    try {
      // Try to encode/decode to ensure it's valid
      const encoded = new TextEncoder().encode(prompt);
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(encoded);
      return decoded;
    } catch (e) {
      // If encoding fails, try to clean it up
      console.warn('Prompt encoding issue, cleaning...');
      return prompt
        .split('')
        .filter(char => {
          const code = char.charCodeAt(0);
          // Keep only printable ASCII and common Unicode ranges
          return (code >= 32 && code <= 126) || (code >= 160 && code <= 55295) || (code >= 57344 && code <= 65535);
        })
        .join('');
    }
  }

  /**
   * Enhanced chat with advanced reasoning and memory
   */
  async intelligentChat(message: string, context?: any): Promise<string> {
    // Fast path: small prompt that matches our CLI connectivity test
    try {
      const quick = await this.quickChat(message, context);
      this.addToMemory('user', message);
      this.addToMemory('assistant', quick);
      return quick;
    } catch (quickError) {
      console.warn('[Pathfinder] quickChat failed, trying full pipeline:', quickError);
    }

    try {
      return await this.runIntelligentChat(message, context);
    } catch (error) {
      console.error('Intelligent chat pipeline error:', error);
      if (!getGeminiApiKey()) {
        return '🧭 **Pathfinder Setup Required** 🧭\n\nAdd `EXPO_PUBLIC_GEMINI_API_KEY` to your `.env` file and restart the dev server.';
      }
      try {
        return await this.quickChat(message, context);
      } catch {
        return this.getFallbackChatResponse(message, error);
      }
    }
  }

  private async runIntelligentChat(message: string, context?: any): Promise<string> {
    // Ensure location database is initialized
    await locationDatabase.initialize();
    
    // Add user message to memory
    this.addToMemory('user', message);
    
    // Sanitize context to remove non-serializable objects
    const sanitizedContext = context ? this.sanitizeContext(context) : context;
    
    // Check for booking intent and process it
    const { conversationalBookingService } = await import('./conversational-booking');
    const { userOnboardingService } = await import('./user-onboarding');
    const { bookingContextManager } = await import('./booking-context');
    
    // Mark first message if new user
    if (userOnboardingService.isNewUser()) {
      await userOnboardingService.markFirstMessage();
    }
    
    // Extract preferences from message
    await userOnboardingService.extractPreferences(message);
    
    // Parse booking intent
    const bookingIntent = conversationalBookingService.parseBookingIntent(message, {
      location: sanitizedContext?.location,
      currentDate: new Date(),
    });
    
    // Process booking intent if detected
    let bookingContext = null;
    if (bookingIntent.type && bookingIntent.confidence >= 0.5) {
      bookingContext = await conversationalBookingService.processBookingIntent(bookingIntent);
    } else {
      // Check for existing booking context
      bookingContext = bookingContextManager.getContext();
    }
    
    // Build enhanced prompt with advanced reasoning capabilities and booking context
    let prompt = await this.buildChatPrompt(message, sanitizedContext, bookingContext);
    prompt += this.getPersonalizedContext();
    
    // Add location-specific accuracy guidance using verified database
    const locationInfo = this.getLocationIntelligence(message, sanitizedContext);
    if (locationInfo) {
      prompt += `\n\n**VERIFIED LOCATION INTELLIGENCE:**\n${locationInfo.aiGuidance.context}\n\n**AI INSTRUCTIONS:**\n${locationInfo.aiGuidance.recommendedBehavior}`;
      
      // Add nearby major cities for context if available
      if (locationInfo.nearbyMajorCities.length > 0) {
        const nearbyList = locationInfo.nearbyMajorCities
          .map(c => {
            const pop = c.population != null ? c.population.toLocaleString() : 'unknown';
            return `${c.name} (${c.distance} miles ${c.direction}, population ${pop})`;
          })
          .join(', ');
        prompt += `\n\n**NEARBY MAJOR CITIES FOR REFERENCE:** ${nearbyList}`;
      }
      
      // 🎯 NEW: Fetch REAL places data if user is asking about things to do
      const lowerMessage = message.toLowerCase();
      const isAskingAboutPlaces = 
        lowerMessage.includes('what to do') ||
        lowerMessage.includes('things to do') ||
        lowerMessage.includes('places to') ||
        lowerMessage.includes('where to') ||
        lowerMessage.includes('recommend') ||
        lowerMessage.includes('suggest') ||
        lowerMessage.includes('attractions') ||
        lowerMessage.includes('restaurants') ||
        lowerMessage.includes('hotels') ||
        lowerMessage.includes('visit');
      
      if (isAskingAboutPlaces && locationInfo?.city) {
        const realPlacesData = await this.getRealPlacesData(locationInfo.city.name, locationInfo.city.stateCode);
        if (realPlacesData) {
          prompt += realPlacesData;
        }
      }
    }
    
    // Add advanced reasoning instructions
    prompt += this.getAdvancedReasoningInstructions(message, sanitizedContext);
    
    // Sanitize the prompt string itself
    prompt = this.sanitizePrompt(prompt);
    
    // Limit prompt size to prevent serialization errors (roughly 30k characters for safety)
    const MAX_PROMPT_LENGTH = 30000;
    if (prompt.length > MAX_PROMPT_LENGTH) {
      console.warn(`Prompt too long (${prompt.length} chars), truncating to ${MAX_PROMPT_LENGTH} chars`);
      // Keep the beginning (instructions) and end (user message), truncate middle
      const instructionEnd = prompt.indexOf('\n\n**VERIFIED LOCATION INTELLIGENCE:**');
      const userMessageStart = prompt.lastIndexOf('\nUser message:');
      
      if (instructionEnd > 0 && userMessageStart > instructionEnd) {
        const instructions = prompt.substring(0, instructionEnd);
        const userMessage = prompt.substring(userMessageStart);
        const maxMiddleLength = MAX_PROMPT_LENGTH - instructions.length - userMessage.length - 500;
        const middle = prompt.substring(instructionEnd, userMessageStart);
        const truncatedMiddle = middle.length > maxMiddleLength 
          ? middle.substring(0, maxMiddleLength) + '\n\n[...content truncated for length...]'
          : middle;
        prompt = instructions + truncatedMiddle + userMessage;
      } else {
        // Fallback: just truncate
        prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + '\n\n[...prompt truncated for length...]';
      }
    }
    
    // Final sanitization after truncation
    prompt = this.sanitizePrompt(prompt);
    
    try {
      // Ensure prompt is a plain string, not an object
      let promptString = typeof prompt === 'string' ? prompt : String(prompt);
      
      // Final validation - ensure it's a clean string
      if (typeof promptString !== 'string') {
        throw new Error('Prompt is not a string after sanitization');
      }
      
      // Remove any remaining problematic characters
      promptString = promptString.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
      
      const result = await this.getModel().generateContent(promptString);
      const response = await result.response;
      let aiResponse = this.extractResponseText(response);
      if (!aiResponse.trim()) {
        return await this.quickChat(message, context);
      }
      
      // If we have booking options, append them to the response
      if (bookingContext && bookingContext.options && bookingContext.options.length > 0) {
        const bookingSuggestion = conversationalBookingService.formatBookingSuggestion(bookingContext);
        if (bookingSuggestion) {
          aiResponse += '\n\n' + bookingSuggestion;
        }
      }
      
      // Add AI response to memory
      this.addToMemory('assistant', aiResponse);
      
      return aiResponse;
    } catch (error: any) {
      console.error('Intelligent chat error:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        stack: error?.stack?.substring(0, 500),
      });
      
      // Check for API key issues
      if (error?.message?.includes('API_KEY') || 
          error?.message?.includes('api key') ||
          error?.message?.includes('API key') ||
          !getGeminiApiKey()) {
        console.error('Gemini API key is missing or invalid');
        return "🧭 **Pathfinder Setup Required** 🧭\n\nTo use Pathfinder, please set your Gemini API key in your environment variables:\n\n1. Create a `.env` file in your project root\n2. Add: `EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here`\n3. Restart the development server\n\nGet your API key from: https://makersuite.google.com/app/apikey";
      }
      
      // Check for model name issues
      if (error?.message?.includes('model') || error?.message?.includes('Model')) {
        console.error('Model name may be incorrect:', error?.message);
      }
      
      // Check for serialization errors specifically
      if (error?.message?.includes('Serialization') || 
          error?.message?.includes('serialization') ||
          error?.message?.includes('StreamUnifiedChatRequest') ||
          error?.message?.includes('Cannot serialize')) {
        console.error('Serialization error detected - context may contain non-serializable objects');
        // Try again with minimal context
        try {
          const minimalPrompt = await this.buildChatPrompt(message, {}, null);
          const minimalResult = await this.getModel().generateContent(minimalPrompt);
          const minimalResponse = await minimalResult.response;
          return this.extractResponseText(minimalResponse);
        } catch (retryError) {
          console.error('Retry with minimal context also failed:', retryError);
        }
      }
      
      try {
        return await this.quickChat(message, context);
      } catch (retryError) {
        console.error('quickChat retry after full pipeline failed:', retryError);
      }

      return this.getFallbackChatResponse(message, error);
    }
  }

  /**
   * Generate advanced reasoning instructions based on message type
   */
  private getAdvancedReasoningInstructions(message: string, context?: any): string {
    const lowerMessage = message.toLowerCase();
    let instructions = '\n\n**ADVANCED REASONING PROTOCOL:**\n';
    
    // Analyze message type and apply appropriate reasoning
    if (lowerMessage.includes('plan') || lowerMessage.includes('trip') || lowerMessage.includes('route')) {
      instructions += `- **Planning Request Detected:** Apply multi-variable optimization framework
- Consider: cost efficiency, time optimization, experience quality, safety factors
- Provide alternative scenarios with pros/cons analysis
- Include risk assessment and contingency planning\n`;
    }
    
    if (lowerMessage.includes('cost') || lowerMessage.includes('budget') || lowerMessage.includes('price')) {
      instructions += `- **Economic Analysis Required:** Apply cost-benefit optimization
- Analyze hidden costs, value propositions, and market timing
- Provide confidence intervals for price estimates
- Consider seasonal pricing variations and demand fluctuations\n`;
    }
    
    if (lowerMessage.includes('weather') || lowerMessage.includes('season') || lowerMessage.includes('climate')) {
      instructions += `- **Environmental Intelligence:** Apply weather pattern analysis
- Consider seasonal variations, local climate characteristics
- Assess impact on activities, crowds, and pricing
- Provide adaptive recommendations for weather contingencies\n`;
    }
    
    if (lowerMessage.includes('safety') || lowerMessage.includes('risk') || lowerMessage.includes('danger')) {
      instructions += `- **Risk Assessment Protocol:** Apply safety analysis framework
- Evaluate location-specific risks and mitigation strategies
- Consider user profile and risk tolerance
- Provide emergency protocols and contingency plans\n`;
    }
    
    if (lowerMessage.includes('culture') || lowerMessage.includes('local') || lowerMessage.includes('custom')) {
      instructions += `- **Cultural Intelligence:** Apply local context analysis
- Consider cultural norms, social etiquette, and local customs
- Assess language barriers and communication strategies
- Provide culturally appropriate recommendations\n`;
    }
    
    // Add general advanced reasoning requirements
    instructions += `- **Reasoning Transparency:** Show your analytical process explicitly
- **Confidence Calibration:** Indicate certainty levels for recommendations
- **Predictive Insights:** Anticipate potential issues and suggest alternatives
- **Cross-Domain Synthesis:** Integrate knowledge from multiple expertise areas\n`;
    
    return instructions;
  }

  /**
   * Fallback chat response
   */
  private getFallbackChatResponse(message: string, error?: unknown): string {
    const detail = error instanceof Error ? error.message : undefined;
    const hint = detail
      ? `\n\n_Technical detail: ${detail.slice(0, 120)}_`
      : '\n\n_Restart the dev server after changing `.env`, then reload the app._';

    return `🧭 **Pathfinder couldn't reach Gemini** 🧭

I couldn't get a live AI response for "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}".

**Check:**
1. \`EXPO_PUBLIC_GEMINI_API_KEY\` is set in \`.env\` (not a Maps key)
2. Dev server restarted: \`npm run start\`
3. App reloaded (press \`r\` in terminal or shake device → Reload)
4. Run \`node scripts/test-gemini-connection.js\` — should say PASS${hint}`;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.getModel().generateContent("Say 'connected' if you can hear me.");
      const response = await result.response;
      const text = this.extractResponseText(response);
      return text.toLowerCase().includes('connected');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();

