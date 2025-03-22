"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import debounce from "lodash.debounce";
import { FaSearch } from "react-icons/fa";

interface Suggestion {
   suggestion: string;
   type: string;
}
interface SearchBarProps {
   initialValue?: string;
   resetState?: () => void;
   course?: string;
   professor?: string;
   routeType?: "course" | "professor" | null;
}

export default function SearchBar({
   initialValue = "",
   resetState,
   course,
   professor,
   routeType,
}: SearchBarProps) {
   const [searchInput, setSearchInput] = useState(initialValue);
   const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const router = useRouter();

   useEffect(() => {
      setSearchInput(initialValue);
      // If initialValue is empty, clear suggestions.
      if (!initialValue) {
        setSuggestions([]);
      }
    }, [initialValue]);

   const fetchSuggestions = useRef(
      debounce(async (input: string) => {
          const trimmedInput = input.trim();
          if (trimmedInput.length > 1) {
              setIsLoading(true);
              try {
                  // Encode the input
                  const response = await fetch(
                      `/api/courses/search?query=${encodeURIComponent(trimmedInput)}`
                  );
                  if (!response.ok) {
                      throw new Error(`API request failed: ${response.status}`);
                  }
                  const data = await response.json();
                  setSuggestions(data);
              } catch (error) {
                  console.error("Error fetching suggestions:", error);
                  setSuggestions([]); // Clear suggestions on error
              } finally {
                  setIsLoading(false);
              }
          } else {
              setSuggestions([]);
          }
      }, 300)
    ).current;

    useEffect(() => {
      return () => {
          fetchSuggestions.cancel();
      };
    }, [fetchSuggestions]);

   const handleSearch = (suggestion: string) => {
      setSearchInput(suggestion);
      setSuggestions([]);

      /* 
         'course' contains the course subject and code e.g. "CSE 3320"
         'suggestion' contains course subject, code, and name e.g. "CSE 3320 OPERATING SYSTEMS"
         Extract the first two terms from 'suggestion' to compare against 'course' below.
      */
      const courseSuggestion = suggestion.split(" ").slice(0, 2).join(" ")

      /* 
         Do not reset the state if user searches for the content already displayed.
         e.g. If user is on the CSE 3320 page and searches for CSE 3320, do not reset
         the state as this will break the displayed results. Only reset the state if
         routing to new content. 
      */
      const isSameCourse = course && suggestion.startsWith(course) && routeType === "course";
      const isSameProfessor = professor && suggestion === professor && routeType === "professor";
  
      if (!(isSameCourse || isSameProfessor) && resetState) {
            resetState();
      }


      // Check if the suggestion is a professor or a course
      const isProfessor = suggestions.find(
         (s) => s.suggestion === suggestion && s.type === "professor"
      );

      // Splitting the input string to extract the subject_id and course_number
      const parts = courseSuggestion.split(' '); 
      if (parts.length >= 2) {
         const coursePrefix = parts[0]; 
         const courseNumber = parts[1]; 

         // Check if the second part is a four-digit number
         if (courseNumber.length === 4 && !isNaN(Number(courseNumber))) {
               suggestion = `${coursePrefix} ${courseNumber}`;
         }
      }

      if (isProfessor) {
         router.push(`/results?professor=${encodeURIComponent(suggestion)}`); // Redirect to professor results
      } else {
         router.push(`/results?course=${encodeURIComponent(suggestion)}`); // Redirect to course results
      }
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setSearchInput(input);
      fetchSuggestions(input);
   };

   return (
      <div className="relative w-full max-w-lg mx-auto">
         <div className="relative">
            <input
               type="text"
               placeholder="Search for a course or professor"
               value={searchInput}
               onChange={handleInputChange}
               onKeyDown={(e) => {
                if (e.key === 'Enter' && suggestions.length > 0) {
                    handleSearch(suggestions[0].suggestion);
                    e.preventDefault();
                }
               }}
               className="w-full p-3 border border-gray-500 rounded-xl shadow-sm focus:outline-none focus:border-blue-500 bg-white bg-opacity-10"
               aria-label="Search for a course or professor"
               aria-autocomplete="list"
            />
            <FaSearch
              onClick={() =>  suggestions.length > 0 && handleSearch(suggestions[0].suggestion)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-300 w-4 h-4"
            />
         </div>
         {isLoading && (
            <div className="absolute w-full max-h-60 bg-gray-200 border border-gray-500 rounded-lg mt-2 shadow-lg z-10 text-black"></div>
         )}
         {suggestions.length > 0 && !isLoading && (
            <ul className="absolute w-full max-h-60 bg-white border border-gray-300 rounded-lg mt-2 shadow-lg z-10 overflow-y-auto">
               {suggestions.map((suggestion, index) => (
                  <li
                     key={index}
                     onClick={() => handleSearch(suggestion.suggestion)}
                     className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-black"
                  >
                     {suggestion.suggestion}
                  </li>
               ))}
            </ul>
         )}
      </div>
   );
}
