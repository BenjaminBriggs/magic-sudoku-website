// Function to load and include HTML partials
async function includeHTML() {
    // Get all elements with the include-html attribute
    const includes = document.querySelectorAll('[include-html]');
    
    // Process each include element
    for (const element of includes) {
      // Get the file path from the include-html attribute
      const filePath = element.getAttribute('include-html');
      
      try {
        // Fetch the HTML content
        const response = await fetch(filePath);
        
        if (!response.ok) {
          throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
        }
        
        // Get the HTML content as text
        const htmlContent = await response.text();
        
        // Insert the content into the element
        element.innerHTML = htmlContent;
        
        // Remove the include-html attribute as it's no longer needed
        element.removeAttribute('include-html');
        
        // Optional: If the included HTML has scripts, execute them
        const scripts = element.querySelectorAll('script');
        for (const script of scripts) {
          const newScript = document.createElement('script');
          newScript.textContent = script.textContent;
          if (script.src) newScript.src = script.src;
          document.head.appendChild(newScript);
          script.remove();
        }
      } catch (error) {
        console.error(`Error including HTML: ${error.message}`);
        element.innerHTML = `<p>Error loading content.</p>`;
      }
    }
  }
  
  // Run the include function when the DOM is loaded
  document.addEventListener('DOMContentLoaded', includeHTML);