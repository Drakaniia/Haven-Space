# Haven Space - Project Planning Documentation

## Future Plans & Roadmap

### SCSS Migration (Planned)

**Status:** Not started - Future consideration

**Overview:**
Migrate from standard CSS to SCSS (Sassy CSS) to improve maintainability, reusability, and developer experience.

**Motivation:**

- Better code organization through nesting and modular imports
- Reusable mixins for common patterns (responsive breakpoints, animations)
- Variables with better tooling support (`$variables` vs `--custom-properties`)
- Functions for color manipulation and calculations
- `@extend` for DRY style inheritance

**Migration Steps:**

1. Install SCSS compiler / configure build tool (e.g., Dart Sass)
2. Update `package.json` with SCSS dependencies
3. Rename `.css` files to `.scss` incrementally
4. Convert CSS custom properties to SCSS variables where appropriate
5. Implement nesting for component styles
6. Create mixin library for reusable patterns
7. Update build scripts to compile SCSS → CSS
8. Test all dashboard views for style regressions

**Considerations:**

- Maintain CSS custom properties for runtime-dynamic values (theme switching)
- Use SCSS variables for static design tokens (colors, spacing, typography)
- Keep file structure modular: `scss/components/`, `scss/views/`, `scss/abstracts/`
- Ensure GitHub Actions workflow compiles SCSS before deployment

**Estimated Impact:**

- Developer experience: **High** (easier maintenance, less repetition)
- Performance: **Neutral** (SCSS compiles to standard CSS)
- Build complexity: **Low** (minimal configuration required)

---

### AI Assistant / Chatbot Integration (Planned)

**Status:** Not started - Future consideration

**Overview:**
Integrate an AI-powered assistant/chatbot into the dashboard to help users (landlords, boarders, and admins) with common tasks, answer questions, and provide contextual support.

**Use Cases:**

- **Onboarding assistance**: Guide new users through platform features and setup
- **Property recommendations**: Suggest rooms/boarding houses based on user preferences and location
- **Booking support**: Help users create, modify, or cancel rental applications
- **FAQ & troubleshooting**: Answer common questions about payments, maintenance, messaging
- **Smart search**: Natural language queries for finding rooms, filtering by amenities, price, location
- **Maintenance request guidance**: Walk users through submitting detailed maintenance requests
- **Payment reminders**: Proactive notifications and payment assistance
- **Landlord analytics insights**: Explain reports and suggest improvements for listings

**Technical Approach:**

1. **AI Provider Integration**:

   - Option A: OpenAI API (GPT-4/GPT-4o)
   - Option B: Google Gemini API
   - Option C: Self-hosted open-source model (e.g., Llama 3, Mistral)
   - Evaluate cost, latency, and privacy requirements

2. **Chat Interface**:

   - Floating chat widget in dashboard (bottom-right corner)
   - Collapsible/minimizable for non-intrusive UX
   - Message history and conversation persistence
   - Typing indicators and streaming responses
   - Rich message support (links, images, quick replies)

3. **Backend Architecture**:

   - API endpoint for chat messages (`/api/assistant/chat`)
   - Context management (user role, current page, recent activity)
   - Rate limiting and abuse prevention
   - Conversation history storage (database or Redis)
   - System prompts tailored to user role and context

4. **Frontend Implementation**:

   - Reusable chat component (`client/components/ai-assistant.html`)
   - Component styles (`client/css/components/ai-assistant.css`)
   - Component logic (`client/js/components/ai-assistant.js`)
   - State management for conversations
   - WebSocket or SSE for real-time streaming responses

5. **Context Awareness**:
   - Inject user context into prompts (role, current listings, applications)
   - Smart suggestions based on dashboard page
   - Access to knowledge base (FAQs, policies, guides)
   - Integration with existing data (payments, maintenance requests, messages)

**Privacy & Security Considerations:**

- No sensitive data (passwords, payment details) sent to AI models
- Anonymize or hash personal information in prompts
- Clear user consent for AI data processing
- Option to disable AI assistant per user preference
- Comply with data protection regulations

**Implementation Phases:**

**Phase 1 - Basic Chat Widget:**

- Build UI component (chat bubble, message list, input field)
- Connect to AI provider API
- Implement basic conversational responses
- Deploy to one dashboard role (e.g., boarder first)

**Phase 2 - Context Integration:**

- Add user context to prompts (role, current page, recent activity)
- Implement smart suggestions and quick actions
- Add conversation history and persistence
- Expand to all dashboard roles

**Phase 3 - Advanced Features:**

- Natural language commands ("show me rooms under $500")
- Action execution (create maintenance request, submit application)
- Proactive assistance (payment reminders, application updates)
- Analytics on common questions and user satisfaction

**Estimated Effort:**

- Phase 1: 2-3 weeks
- Phase 2: 2-3 weeks
- Phase 3: 3-4 weeks

**Success Metrics:**

- Reduction in support tickets/FAQ requests
- User engagement with assistant (daily active users)
- Task completion rate through assistant
- User satisfaction scores

**Estimated Impact:**

- User experience: **High** (instant support, reduced friction)
- Development complexity: **Medium** (API integration, context management)
- Operational cost: **Medium** (AI API usage, monitoring)
- Competitive advantage: **High** (differentiator in market)

---

## Related Documentation

- [Contributing Guidelines](../.github/CONTRIBUTING.md)
- [Frontend README](../client/README.md)
- [Backend README](../server/Readme.md)
