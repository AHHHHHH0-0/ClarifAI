import React, { useEffect, useState } from "react";
import { socket } from "../../services/socket";
import { Concept } from "../../types";

export const ConceptDetector: React.FC = () => {
  const [concepts, setConcepts] = useState<Concept[]>([]);

  useEffect(() => {
    socket.on("concept-detected", (newConcept: Concept) => {
      setConcepts((prev) => [...prev, newConcept]);
    });

    return () => {
      socket.off("concept-detected");
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {concepts.map((concept) => (
        <div
          key={concept.id}
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {concept.term}
            </h3>
            <span className="text-sm text-gray-500">
              {new Date(concept.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <p className="text-gray-600 mb-3">{concept.explanation}</p>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${concept.confidence}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
