// ===== FILE: src/components/common/FSPortalProjectInput.jsx =====
// Create this new file in your src/components/common/ directory

import React, { useState, useEffect } from 'react';
import { Search, Building2, User, DollarSign, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import { fsPortalProjectService } from '../../services/fsPortalProjectService';

const FSPortalProjectInput = ({ 
  value, 
  onChange, 
  className = '', 
  placeholder = "Enter FS Portal project code...",
  companyFilter = null // Filter to specific company (FS, BWS, etc.)
}) => {
  const [availableProjects, setAvailableProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null); // 'valid', 'invalid', 'manual'

  useEffect(() => {
    loadProjects();
  }, [companyFilter]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projects = await fsPortalProjectService.getProjectCodes(companyFilter);
      setAvailableProjects(projects);
      
      // If current value matches a project, set it as selected
      const match = projects.find(p => p.projectCode === value);
      if (match) {
        setSelectedProject(match);
        setValidationStatus('valid');
      }
    } catch (error) {
      console.error('Error loading FS Portal projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (inputValue) => {
    onChange(inputValue);
    setSelectedProject(null);
    setValidationStatus(null);
    
    if (inputValue.length > 1) {
      const filtered = fsPortalProjectService.searchProjects(inputValue, availableProjects);
      setFilteredProjects(filtered);
      setShowSuggestions(true);
      
      // Check for exact match
      const exactMatch = availableProjects.find(p => 
        p.projectCode.toLowerCase() === inputValue.toLowerCase()
      );
      
      if (exactMatch) {
        setSelectedProject(exactMatch);
        setValidationStatus('valid');
      } else if (inputValue.length > 3) {
        // Validate format for manual entry
        const isValidFormat = fsPortalProjectService.validateProjectCode(inputValue);
        setValidationStatus(isValidFormat ? 'manual' : 'invalid');
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleProjectSelect = (project) => {
    onChange(project.projectCode);
    setSelectedProject(project);
    setValidationStatus('valid');
    setShowSuggestions(false);
  };

  const getCompanyBadgeColor = (prefix) => {
    const company = fsPortalProjectService.getCompanyInfo(prefix);
    return company.color;
  };

  const getValidationIcon = () => {
    if (loading) return <Search className="animate-spin h-4 w-4 text-blue-500" />;
    
    switch (validationStatus) {
      case 'valid':
        return <div className="h-2 w-2 bg-green-500 rounded-full" title="Valid FS Portal project" />;
      case 'manual':
        return <div className="h-2 w-2 bg-orange-500 rounded-full" title="Valid format - manual entry" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" title="Invalid project code format" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Main Input */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => value.length > 1 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className={`${className} ${
            selectedProject ? 'border-green-300 bg-green-50' : 
            validationStatus === 'invalid' ? 'border-red-300 bg-red-50' :
            validationStatus === 'manual' ? 'border-orange-300 bg-orange-50' : ''
          } pr-8`}
          placeholder={loading ? 'Loading projects...' : placeholder}
          disabled={loading}
          title="Enter FS Portal project code (e.g., BWS-S1046, FS-P1079)"
        />
        
        {/* Validation Indicator */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          {getValidationIcon()}
        </div>
      </div>

      {/* Selected Project Info */}
      {selectedProject && (
        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="px-2 py-0.5 rounded text-white text-xs font-medium"
              style={{ backgroundColor: getCompanyBadgeColor(selectedProject.companyPrefix) }}
            >
              {selectedProject.companyPrefix}
            </span>
            <span className="font-medium truncate">{selectedProject.jobTitle}</span>
            {selectedProject.source === 'fs-portal' && (
              <ExternalLink className="h-3 w-3 text-blue-500" title="From FS Portal" />
            )}
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-1">
              <Building2 size={10} />
              <span className="truncate">{selectedProject.clientCompany}</span>
            </div>
            <div className="flex items-center gap-1">
              <User size={10} />
              <span>{selectedProject.picName}</span>
            </div>
            {selectedProject.amount > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign size={10} />
                <span>RM {selectedProject.amount.toLocaleString()}</span>
              </div>
            )}
            {selectedProject.dateCreated && (
              <div className="flex items-center gap-1">
                <Calendar size={10} />
                <span>{selectedProject.dateCreated}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredProjects.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => handleProjectSelect(project)}
              className="w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Project Code and Company Badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="px-2 py-0.5 rounded text-white text-xs font-medium"
                      style={{ backgroundColor: getCompanyBadgeColor(project.companyPrefix) }}
                    >
                      {project.companyPrefix}
                    </span>
                    <span className="font-medium text-sm">{project.projectCode}</span>
                    {project.source === 'fs-portal' && (
                      <ExternalLink className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                  
                  {/* Job Title */}
                  <div className="text-sm text-gray-900 mb-1 truncate">
                    {project.jobTitle}
                  </div>
                  
                  {/* Client and Details */}
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building2 size={10} />
                      <span className="truncate">{project.clientCompany}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User size={10} />
                      <span>{project.picName}</span>
                    </div>
                    {project.dateCreated && (
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{project.dateCreated}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Amount and Status */}
                {project.amount > 0 && (
                  <div className="text-right text-xs ml-2">
                    <div className="font-medium text-gray-900">
                      RM {project.amount.toLocaleString()}
                    </div>
                    <div className="text-gray-500">{project.probability}</div>
                  </div>
                )}
              </div>
            </button>
          ))}
          
          {/* Show company filter info */}
          {companyFilter && (
            <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-500">
              Showing {fsPortalProjectService.getCompanyInfo(companyFilter).fullName} projects
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && filteredProjects.length === 0 && value.length > 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
          No projects found matching "{value}"
          {companyFilter && (
            <div className="mt-1 text-xs">
              in {fsPortalProjectService.getCompanyInfo(companyFilter).fullName}
            </div>
          )}
        </div>
      )}

      {/* Company Filter Display */}
      {companyFilter && !showSuggestions && (
        <div className="mt-1 text-xs text-gray-500">
          Filtering: {fsPortalProjectService.getCompanyInfo(companyFilter).fullName} projects only
        </div>
      )}
    </div>
  );
};

export default FSPortalProjectInput;
