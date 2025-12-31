import { useState, useEffect } from 'react';

interface StartupScreenProps {
  onStart: () => void;
}

export function StartupScreen({ onStart }: StartupScreenProps) {
  const [currentGuide, setCurrentGuide] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const totalGuides = 4;
  
  const guideImageSets = [
    // claimland = claim1, claim2, claim3, claim4
    [
      '/elements/GuildeUI/Img/claim1.png',
      '/elements/GuildeUI/Img/claim2.png',
      '/elements/GuildeUI/Img/claim3.png',
      '/elements/GuildeUI/Img/claim4.png'
    ],
    // knockoutplayer = knockout1, knockout2, knockout3, knockout4
    [
      '/elements/GuildeUI/Img/knockout1.png',
      '/elements/GuildeUI/Img/knockout2.png',
      '/elements/GuildeUI/Img/knockout3.png',
      '/elements/GuildeUI/Img/knockout4.png'
    ],
    // dontknockurself = knockurself1, knockurself2, knockurself3, knockurself4
    [
      '/elements/GuildeUI/Img/knockurself1.png',
      '/elements/GuildeUI/Img/knockurself2.png',
      '/elements/GuildeUI/Img/knockurslef3.png',
      '/elements/GuildeUI/Img/knockurself4.png'
    ],
    // control giữ nguyên
    [
      '/elements/GuildeUI/Img/control.png'
    ]
  ];

  // Reset về ảnh đầu tiên và tự động chuyển ảnh khi chuyển guide
  useEffect(() => {
    setCurrentImageIndex(0);
    const currentSet = guideImageSets[currentGuide];
    if (currentSet.length <= 1) return; // Không cần chuyển nếu chỉ có 1 ảnh

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % currentSet.length);
    }, 400); // Chuyển ảnh mỗi 400ms

    return () => clearInterval(interval);
  }, [currentGuide]);

  const handlePrevious = () => {
    setCurrentGuide((prev) => (prev === 0 ? totalGuides - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentGuide((prev) => (prev === totalGuides - 1 ? 0 : prev + 1));
  };

  return (
    <div className="startup-screen">
      <div className="startup-background"></div>
      
      <div className="startup-content">
        {/* Logo */}
        <div className="startup-logo-container">
          <img 
            src="/elements/GuildeUI/Logo@4x.png" 
            alt="Game Logo" 
            className="startup-logo"
          />
          <img 
            src="/elements/GuildeUI/howtoplay@2x.png" 
            alt="How to Play" 
            className="startup-howtoplay"
          />
        </div>

        {/* Horizontal Box with Guides */}
        <div className="startup-horizontal-box">
          {/* Guide Navigation Buttons */}
          <img 
            src="/elements/GuildeUI/leftArrow@2x.png" 
            alt="Previous guide"
            className="guide-nav-button guide-nav-left"
            onClick={handlePrevious}
          />
          
          <img 
            src="/elements/GuildeUI/RightArrow@2x.png" 
            alt="Next guide"
            className="guide-nav-button guide-nav-right"
            onClick={handleNext}
          />

          {/* Guide Content - Images with auto-play */}
          <div className="guide-content-wrapper">
            <div className="guide-item active">
              <img 
                src={guideImageSets[currentGuide][currentImageIndex]} 
                alt={`Guide ${currentGuide + 1} - Image ${currentImageIndex + 1}`}
                className="guide-image"
                key={`${currentGuide}-${currentImageIndex}`}
              />
            </div>
          </div>

          {/* Guide Indicators */}
          <div className="guide-indicators">
            {Array.from({ length: totalGuides }).map((_, index) => (
              <div
                key={index}
                className={`guide-indicator ${index === currentGuide ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Start Button */}
        <img 
          src="/elements/GuildeUI/StartButton_1@2x.png" 
          alt="Start"
          className="startup-start-button"
          onClick={onStart}
        />
      </div>
    </div>
  );
}
