import { layers } from "../../constants/layers";

export default function LayerOptions({
  currentIndex,
  selectedLayer,
  setSelectedLayer,
}) {
  function updateLayer(layerindex) {
    setSelectedLayer((selectedLayer) => {
      const updatedLayer = [...selectedLayer]; // Create a shallow copy of the array
      updatedLayer[currentIndex] = layerindex; // Update the specific index
      return updatedLayer;
    });

  }

  return (
    <div className="option-layers-box">
      {layers[currentIndex].map((layer, layerindex) => (
        <img
          key={layerindex}
          src={layer}
          alt="layer"
          className={
            selectedLayer[currentIndex] === layerindex
              ? "selected-option-layer"
              : "option-layer"
          }
          onClick={() => updateLayer(layerindex)}
        />
      ))}
    </div>
  );
}
