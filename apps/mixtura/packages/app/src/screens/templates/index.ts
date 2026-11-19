// Templates destination (#18): the overview in the list pane and the detail
// of one template beside it (below 840 px one after the other).

import { h } from '../../dom';
import { type Route } from '../../router';
import { type Screen } from '../../screen';
import { strings } from '../../strings';
import { browseState } from '../browse/load';
import { failedStatus, loadingStatus } from '../drinks/pane';
import { status } from '../status';
import { templateActions, templateBody } from './detail';
import { templatesPane } from './overview';

const isDetail = (route: Route): boolean =>
  route.path[0] === 'templates' && route.path.length === 2;

export const screens: Screen[] = [
  {
    id: 'templates',
    destination: 'templates',
    pushed: false,
    match: (route) => route.path.length === 1 && route.path[0] === 'templates',
    view: (context) => ({
      title: strings.titles.templates,
      body: status(strings.browse.selectTemplate),
      list: templatesPane(context, 'list'),
    }),
  },
  {
    id: 'template-detail',
    destination: 'templates',
    pushed: true,
    match: isDetail,
    view(context) {
      const id = context.route.path[1] ?? '';
      const state = browseState(context);
      const list = templatesPane(context, 'detail', id);
      if (state.kind !== 'ready') {
        return {
          title: strings.titles.templates,
          body: state.kind === 'loading' ? loadingStatus() : failedStatus(state.reason),
          list,
        };
      }
      const template = state.model.templateById.get(id);
      if (!template) {
        return {
          title: strings.titles.notFound,
          body: h(
            'div',
            { class: 'status' },
            h('h2', {}, strings.templates.notFoundTitle),
            h('p', {}, strings.templates.notFoundText),
            h(
              'a',
              { class: 'btn btn--primary', href: '#/templates' },
              strings.templates.openTemplates,
            ),
          ),
          list,
        };
      }
      return {
        title: template.name,
        body: templateBody(state.model, template),
        actions: templateActions(template),
        list,
      };
    },
  },
];
