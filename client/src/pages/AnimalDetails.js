// src/pages/AnimalDetails.js (or src/components/AnimalDetails.js)
import React, { useState } from 'react';
import './DashboardPage.css'; // Re-use existing CSS for general card/button styling

// Mock data for adoptable animals
const mockAdoptableAnimals = [
  {
    id: 'a1',
    name: 'Buddy',
    mainPhoto: 'https://placehold.co/200x150/87CEEB/ffffff?text=Buddy',
    gallery: [
      'https://placehold.co/100x75/87CEEB/ffffff?text=Buddy1',
      'https://placehold.co/100x75/87CEEB/ffffff?text=Buddy2',
      'https://placehold.co/100x75/87CEEB/ffffff?text=Buddy3',
    ],
    type: 'Dog',
    breed: 'Golden Retriever',
    mixed: false,
    sex: 'Male',
    age: '2 years',
    temperament: 'Friendly, energetic, good with kids and other pets. Loves to play fetch.'
  },
  {
    id: 'a2',
    name: 'Whiskers',
    mainPhoto: 'https://placehold.co/200x150/FFB6C1/ffffff?text=Whiskers',
    gallery: [
      'https://placehold.co/100x75/FFB6C1/ffffff?text=Whisker1',
      'https://placehold.co/100x75/FFB6C1/ffffff?text=Whisker2',
    ],
    type: 'Cat',
    breed: 'Siamese',
    mixed: true,
    sex: 'Female',
    age: '1 year',
    temperament: 'Affectionate, vocal, enjoys quiet environments. Can be shy at first.'
  },
  {
    id: 'a3',
    name: 'Patches',
    mainPhoto: 'https://placehold.co/200x150/90EE90/ffffff?text=Patches',
    gallery: [
      'https://placehold.co/100x75/90EE90/ffffff?text=Patch1',
    ],
    type: 'Rabbit',
    breed: 'Dutch',
    mixed: false,
    sex: 'Female',
    age: '6 months',
    temperament: 'Curious, gentle, likes to explore. Enjoys fresh vegetables.'
  }
];

function AnimalDetails() {
  const [selectedAnimalAction, setSelectedAnimalAction] = useState(null);

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
          {mockAdoptableAnimals.length > 0 ? (
            <div className="animal-cards-grid">
              {mockAdoptableAnimals.map(animal => (
                <div key={animal.id} className="animal-card">
                  <div className="animal-main-photo-container">
                    <img src={animal.mainPhoto} alt={animal.name} className="animal-main-photo" />
                  </div>
                  {animal.gallery && animal.gallery.length > 0 && (
                    <div className="animal-gallery">
                      {animal.gallery.map((imgSrc, idx) => (
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
