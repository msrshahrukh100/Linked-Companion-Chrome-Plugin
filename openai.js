window.openai = {
    apiKey: null,
    initialize: function(apiKey) {
        this.apiKey = apiKey;
    },
    sendPrompt: async function(systemPrompt, userPrompt) {
        if (!this.apiKey) {
            throw new Error('API key not set. Please initialize OpenAI first.');
        }
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("OpenAI response: ", data.choices[0].message.content)
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            throw error;
        }
    }
};