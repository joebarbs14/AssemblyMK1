// src/pages/AnimalDetails.js (or src/components/AnimalDetails.js)
import React, { useState } from 'react';
import './DashboardPage.css'; // Re-use existing CSS for general card/button styling

// Removed: mockAdoptableAnimals data is no longer needed as data comes from props

function AnimalDetails({ animals }) { // Now accepts 'animals' as a prop
  const [selectedAnimalAction, setSelectedAnimalAction] = useState('Adopt'); // Default to 'Adopt' to show listings

  const handleAnimalActionClick = (action) => {
    setSelectedAnimalAction(action);
  };

  return (
    <div className="animal-details-content">
      <h3 className="animal-section-title">Animal Services</h3>
      <div className="animal-action-buttons">
        <div
          className={`animal-action-tile ${selectedAnimalAction === 'Adopt' ? 'selected-action-tile' : ''}`}
          onClick={() => handleAnimalActionClick('Adopt')}
        >
          <span className="emoji">🐾</span> Adopt An Animal
        </div>
        <div
          className={`animal-action-tile ${selectedAnimalAction === 'Surrender' ? 'selected-action-tile' : ''}`}
          onClick={() => handleAnimalActionClick('Surrender')}
        >
          <span className="emoji">🏡</span> Surrender An Animal
        </div>
        <div
          className={`animal-action-tile ${selectedAnimalAction === 'Lost' ? 'selected-action-tile' : ''}`}
          onClick={() => handleAnimalActionClick('Lost')}
        >
          <span className="emoji">🔍</span> Report Lost
        </div>
        <div
          className={`animal-action-tile ${selectedAnimalAction === 'Support' ? 'selected-action-tile' : ''}`}
          onClick={() => handleAnimalActionClick('Support')}
        >
          <span className="emoji">❤️</span> Animal Care & Support Services
        </div>
      </div>

      {selectedAnimalAction === 'Adopt' && (
        <div className="adoptable-animals-listing">
          <h4 className="listing-title">Animals Available for Adoption</h4>
          {animals && animals.length > 0 ? ( // Check if 'animals' prop exists and has data
            <div className="animal-cards-grid">
              {animals.map(animal => (
                <div key={animal.id} className="animal-card">
                  <div className="animal-main-photo-container">
                    <img src={animal.main_photo_url} alt={animal.name} className="animal-main-photo" />
                  </div>
                  {animal.gallery_urls && animal.gallery_urls.length > 0 && (
                    <div className="animal-gallery">
                      {animal.gallery_urls.map((imgSrc, idx) => (
                        <img key={idx} src={imgSrc} alt={`${animal.name} gallery ${idx + 1}`} className="animal-gallery-thumbnail" />
                      ))}
                    </div>
                  )}
                  <div className="animal-details-text">
                    <h5 className="animal-name">{animal.name}</h5>
                    <p className="animal-info">Type: {animal.type}</p>
                    <p className="animal-info">Breed: {animal.breed} {animal.mixed ? '(Mixed)' : ''}</p>
                    <p className="animal-info">Sex: {animal.sex}</p>
                    <p className="animal-info">Age: {animal.age}</p>
                    <p className="animal-temperament">{animal.temperament}</p>
                    {animal.council_name && (
                      <p className="animal-info">Council: {animal.council_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-entries">No animals currently available for adoption.</p>
          )}
        </div>
      )}

      {selectedAnimalAction === 'Surrender' && (
        <div className="action-info">
          <p>Information on surrendering an animal. Please contact us for details.</p>
          {/* Add a form or more detailed info here */}
        </div>
      )}

      {selectedAnimalAction === 'Lost' && (
        <div className="action-info">
          <p>Information on reporting a lost animal. Provide details and contact information.</p>
          {/* Add a form or more detailed info here */}
        </div>
      )}

      {selectedAnimalAction === 'Support' && (
        <div className="action-info">
          <p>Details about animal care and support services available in your area.</p>
          {/* Add more detailed info here */}
        </div>
      )}
    </div>
  );
}

export default AnimalDetails;
