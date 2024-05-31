// tour.js

let currentSlide = 0;
const totalSlides = 7; // Update this based on the number of slides you have

window.onload = function() {
    console.log("Window loaded");
    showSlide(0);
};

function showSlide(index) {
    console.log("Showing slide", index);
    for (let i = 0; i < totalSlides; i++) {
        document.getElementById(`tutorialSlide${i + 1}`).style.display = 'none';
    }
    const overlay = document.getElementById('tutorialOverlay');
    const currentSlide = document.getElementById(`tutorialSlide${index + 1}`);
    overlay.style.display = 'flex';
    currentSlide.style.display = 'block';
    if (index <= 1) {
        overlay.style.background = 'rgba(0,0,0,0.8)';
    } else {
        overlay.style.background = 'rgba(0,0,0,0)';
    }
    if (overlay && currentSlide) {
        overlay.style.display = 'flex';
        currentSlide.style.display = 'block';

        if (index === 2) {
            currentSlide.classList.add('top-slide');
        }
        if (index === 3) {
            currentSlide.classList.add('top-slide2');
        }
        // Add highlight for slide 3
        const lowerLeft = document.getElementById('lowerleft');
        if (index === 4 && lowerLeft) {
            lowerLeft.classList.add('highlight');
            currentSlide.classList.add('left-slide');
        } else if (lowerLeft) {
            lowerLeft.classList.remove('highlight');
        }
        if (index === 5) {
            currentSlide.classList.add('right-slide');
        }
        //    animateCameraToObject('electrode734');
        // }


    } else {
        console.error('Overlay or current slide element not found');
    }
}

function nextSlide(current) {
    if (current < totalSlides) {
        showSlide(current);
    }
}

function prevSlide(current) {
    if (current > 0) {
        showSlide(current - 1);
    }
}

function endTutorial() {
    document.getElementById('tutorialOverlay').style.display = 'none';
}


