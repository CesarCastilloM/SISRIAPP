import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import '../styles/DataCarousel.css';

const DataCarousel = ({ data }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    const slides = [
        {
            title: 'NDVI',
            value: data?.satellite_data?.ndvi?.mean,
            unit: '',
            description: 'Normalized Difference Vegetation Index',
            color: '#4CAF50'
        },
        {
            title: 'Soil Moisture',
            value: data?.satellite_data?.soil_moisture?.mean,
            unit: '%',
            description: 'Average soil moisture content',
            color: '#2196F3'
        },
        {
            title: 'Surface Temperature',
            value: data?.satellite_data?.surface_temperature?.mean,
            unit: '°C',
            description: 'Land surface temperature',
            color: '#FF5722'
        },
        {
            title: 'ETo',
            value: data?.weather_data?.eto,
            unit: 'mm/day',
            description: 'Reference Evapotranspiration',
            color: '#9C27B0'
        },
        {
            title: 'Air Temperature',
            value: data?.weather_data?.temperature,
            unit: '°C',
            description: 'Current air temperature',
            color: '#FF9800'
        },
        {
            title: 'Humidity',
            value: data?.weather_data?.humidity,
            unit: '%',
            description: 'Relative humidity',
            color: '#00BCD4'
        }
    ];

    useEffect(() => {
        let interval;
        if (isAutoPlaying) {
            interval = setInterval(() => {
                setCurrentIndex((prevIndex) => 
                    prevIndex === slides.length - 1 ? 0 : prevIndex + 1
                );
            }, 5000); // Change slide every 5 seconds
        }
        return () => clearInterval(interval);
    }, [isAutoPlaying, slides.length]);

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) => 
            prevIndex === 0 ? slides.length - 1 : prevIndex - 1
        );
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) => 
            prevIndex === slides.length - 1 ? 0 : prevIndex + 1
        );
    };

    const formatValue = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return typeof value === 'number' ? value.toFixed(2) : value;
    };

    const currentSlide = slides[currentIndex];

    return (
        <div className="data-carousel"
             onMouseEnter={() => setIsAutoPlaying(false)}
             onMouseLeave={() => setIsAutoPlaying(true)}>
            <button className="carousel-button prev" onClick={goToPrevious}>
                <FaChevronLeft />
            </button>
            
            <div className="carousel-content" style={{ borderColor: currentSlide.color }}>
                <h3 style={{ color: currentSlide.color }}>{currentSlide.title}</h3>
                <div className="value-container">
                    <span className="value" style={{ color: currentSlide.color }}>
                        {formatValue(currentSlide.value)}
                    </span>
                    <span className="unit">{currentSlide.unit}</span>
                </div>
                <p className="description">{currentSlide.description}</p>
            </div>

            <button className="carousel-button next" onClick={goToNext}>
                <FaChevronRight />
            </button>

            <div className="carousel-dots">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        className={`dot ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => setCurrentIndex(index)}
                        style={{ backgroundColor: index === currentIndex ? slides[index].color : '' }}
                    />
                ))}
            </div>
        </div>
    );
};

export default DataCarousel;
